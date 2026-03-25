// ============================================================================
// Tracking Sync Job - Periodic AliExpress Tracking Updates
// ============================================================================
// Cron job that polls AliExpress for tracking numbers and delivery updates
// Implements:
// - Batch processing to respect API rate limits
// - Automatic status progression (shipped → in_transit → delivered)
// - Customer notification triggers
// ============================================================================

import cron from 'node-cron';
import { PrismaClient, SupplierOrderStatus, OrderStatus } from '@prisma/client';
import { AliExpressAdapter, AliExpressConfig } from '@infrastructure/adapters/outbound/external-apis/aliexpress.adapter.js';
import { logger } from '@shared/utils/logger.js';

// ============================================================================
// Configuration
// ============================================================================

interface TrackingSyncConfig {
  batchSize: number;           // Orders to process per batch
  delayBetweenBatches: number; // ms delay to respect rate limits
  maxRetries: number;          // Max retries before marking as stale
}

const DEFAULT_CONFIG: TrackingSyncConfig = {
  batchSize: 50,
  delayBetweenBatches: 2000, // 2 seconds
  maxRetries: 10,
};

// Carrier tracking URL templates
const CARRIER_TRACKING_URLS: Record<string, string> = {
  'cainiao': 'https://global.cainiao.com/detail.htm?mailNoList={tracking}',
  'yanwen': 'https://track.yw56.com.cn/en/querydel?nums={tracking}',
  '4px': 'https://track.4px.com/#/result/0/{tracking}',
  'aliexpress': 'https://track.aliexpress.com/logisticsdetail.htm?tradeId={tracking}',
  'dhl': 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}',
  'ups': 'https://www.ups.com/track?tracknum={tracking}',
  'fedex': 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
  'usps': 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}',
  'china_post': 'https://track-chinapost.com/?id={tracking}',
  'default': 'https://t.17track.net/en#nums={tracking}',
};

// ============================================================================
// Tracking Sync Job Class
// ============================================================================

export class TrackingSyncJob {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private readonly prisma: PrismaClient;
  private readonly aliexpress: AliExpressAdapter;
  private readonly config: TrackingSyncConfig;

  constructor(
    prisma: PrismaClient,
    aliexpressConfig: AliExpressConfig,
    config?: Partial<TrackingSyncConfig>
  ) {
    this.prisma = prisma;
    this.aliexpress = new AliExpressAdapter(aliexpressConfig);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the cron job
   * Default: Every 6 hours
   */
  start(schedule = '0 */6 * * *'): void {
    if (this.cronJob) {
      logger.warn('Tracking sync job already running');
      return;
    }

    this.cronJob = cron.schedule(schedule, async () => {
      await this.execute();
    });

    logger.info('Tracking sync job started', { schedule });
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Tracking sync job stopped');
    }
  }

  /**
   * Execute sync manually
   */
  async execute(): Promise<TrackingSyncResult> {
    if (this.isRunning) {
      logger.warn('Tracking sync already in progress, skipping');
      return {
        success: false,
        message: 'Already running',
        processed: 0,
        updated: 0,
        errors: 0,
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let processed = 0;
    let updated = 0;
    let errors = 0;

    try {
      logger.info('Starting tracking sync job');

      // Get orders awaiting tracking or in transit
      const pendingOrders = await this.prisma.supplierOrder.findMany({
        where: {
          status: {
            in: [
              SupplierOrderStatus.submitted,
              SupplierOrderStatus.confirmed,
              SupplierOrderStatus.processing,
              SupplierOrderStatus.shipped,
              SupplierOrderStatus.in_transit,
            ],
          },
          aliexpressOrderId: { not: null },
        },
        orderBy: { updatedAt: 'asc' }, // Process oldest first
        take: this.config.batchSize * 10, // Get enough for multiple batches
      });

      logger.info(`Found ${pendingOrders.length} orders to check`);

      // Process in batches
      for (let i = 0; i < pendingOrders.length; i += this.config.batchSize) {
        const batch = pendingOrders.slice(i, i + this.config.batchSize);

        for (const order of batch) {
          try {
            const wasUpdated = await this.syncOrderTracking(order);
            processed++;
            if (wasUpdated) updated++;
          } catch (error) {
            errors++;
            logger.error('Error syncing tracking', {
              supplierOrderId: order.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Delay between batches to respect rate limits
        if (i + this.config.batchSize < pendingOrders.length) {
          await this.delay(this.config.delayBetweenBatches);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Tracking sync completed', {
        processed,
        updated,
        errors,
        durationMs: duration,
      });

      return {
        success: true,
        message: 'Sync completed',
        processed,
        updated,
        errors,
        durationMs: duration,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync tracking for a single order
   */
  private async syncOrderTracking(order: {
    id: string;
    orderId: string;
    aliexpressOrderId: string | null;
    status: SupplierOrderStatus;
    trackingNumber: string | null;
    retryCount: number;
  }): Promise<boolean> {
    if (!order.aliexpressOrderId) {
      return false;
    }

    try {
      // Fetch tracking from AliExpress
      const tracking = await this.aliexpress.getOrderTracking(order.aliexpressOrderId);

      // Determine new status based on tracking events
      const newStatus = this.determineStatus(tracking, order.status);

      // Check if tracking number is new or status changed
      const hasChanges =
        tracking.trackingNumber !== order.trackingNumber ||
        newStatus !== order.status;

      if (!hasChanges) {
        return false;
      }

      // Build tracking URL
      const trackingUrl = this.buildTrackingUrl(
        tracking.trackingNumber,
        tracking.events?.[0]?.description
      );

      // Update supplier order
      await this.prisma.supplierOrder.update({
        where: { id: order.id },
        data: {
          trackingNumber: tracking.trackingNumber || order.trackingNumber,
          trackingUrl,
          carrier: this.detectCarrier(tracking.trackingNumber),
          status: newStatus,
          ...(newStatus === SupplierOrderStatus.shipped && !order.trackingNumber
            ? { shippedAt: new Date() }
            : {}),
          ...(newStatus === SupplierOrderStatus.delivered
            ? { deliveredAt: new Date() }
            : {}),
        },
      });

      // Update parent order if needed
      await this.updateParentOrderStatus(order.orderId);

      // Trigger notification if significant change
      if (newStatus === SupplierOrderStatus.shipped || newStatus === SupplierOrderStatus.delivered) {
        await this.triggerNotification(order.orderId, newStatus, tracking.trackingNumber);
      }

      logger.info('Tracking updated', {
        supplierOrderId: order.id,
        oldStatus: order.status,
        newStatus,
        trackingNumber: tracking.trackingNumber,
      });

      return true;
    } catch (error) {
      // Increment retry count
      await this.prisma.supplierOrder.update({
        where: { id: order.id },
        data: {
          retryCount: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Determine order status from tracking events
   */
  private determineStatus(
    tracking: { status: string; events?: Array<{ status: string; description: string }> },
    currentStatus: SupplierOrderStatus
  ): SupplierOrderStatus {
    const statusText = tracking.status?.toLowerCase() ?? '';
    const latestEvent = tracking.events?.[0]?.description?.toLowerCase() ?? '';
    const combined = `${statusText} ${latestEvent}`;

    // Delivered indicators
    if (
      combined.includes('delivered') ||
      combined.includes('signed') ||
      combined.includes('received by') ||
      combined.includes('livré') ||
      combined.includes('entregado')
    ) {
      return SupplierOrderStatus.delivered;
    }

    // In transit indicators
    if (
      combined.includes('in transit') ||
      combined.includes('departed') ||
      combined.includes('arrived') ||
      combined.includes('customs') ||
      combined.includes('en route') ||
      combined.includes('out for delivery') ||
      combined.includes('en cours') ||
      combined.includes('en tránsito')
    ) {
      return SupplierOrderStatus.in_transit;
    }

    // Shipped indicators
    if (
      combined.includes('shipped') ||
      combined.includes('dispatched') ||
      combined.includes('posting') ||
      combined.includes('accepted') ||
      combined.includes('expédié') ||
      combined.includes('enviado')
    ) {
      return SupplierOrderStatus.shipped;
    }

    // Processing indicators
    if (
      combined.includes('processing') ||
      combined.includes('preparing') ||
      combined.includes('packing') ||
      combined.includes('en préparation')
    ) {
      return SupplierOrderStatus.processing;
    }

    // Confirmed
    if (
      combined.includes('confirmed') ||
      combined.includes('order placed') ||
      combined.includes('confirmé')
    ) {
      return SupplierOrderStatus.confirmed;
    }

    return currentStatus;
  }

  /**
   * Detect carrier from tracking number format
   */
  private detectCarrier(trackingNumber: string | undefined): string {
    if (!trackingNumber) return 'unknown';

    const tn = trackingNumber.toUpperCase();

    if (/^LP\d+/.test(tn)) return 'cainiao';
    if (/^YT\d+/.test(tn)) return 'yanwen';
    if (/^4PX/.test(tn)) return '4px';
    if (/^\d{10}$/.test(tn)) return 'dhl';
    if (/^1Z[A-Z0-9]{16}$/.test(tn)) return 'ups';
    if (/^\d{12,22}$/.test(tn)) return 'fedex';
    if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(tn)) return 'china_post';
    if (/^AE\d+/.test(tn)) return 'aliexpress';

    return 'default';
  }

  /**
   * Build tracking URL for carrier
   */
  private buildTrackingUrl(trackingNumber: string | undefined, eventDescription?: string): string | null {
    if (!trackingNumber) return null;

    const carrier = this.detectCarrier(trackingNumber);
    const template = CARRIER_TRACKING_URLS[carrier] ?? CARRIER_TRACKING_URLS['default'];

    return template.replace('{tracking}', encodeURIComponent(trackingNumber));
  }

  /**
   * Update parent order status based on all supplier orders
   */
  private async updateParentOrderStatus(orderId: string): Promise<void> {
    const supplierOrders = await this.prisma.supplierOrder.findMany({
      where: { orderId },
    });

    if (supplierOrders.length === 0) return;

    // Determine aggregate status
    const allDelivered = supplierOrders.every(o => o.status === SupplierOrderStatus.delivered);
    const anyShipped = supplierOrders.some(o =>
      [SupplierOrderStatus.shipped, SupplierOrderStatus.in_transit, SupplierOrderStatus.delivered].includes(o.status)
    );

    let orderStatus: OrderStatus | null = null;
    const updateData: { status?: OrderStatus; shippedAt?: Date; deliveredAt?: Date } = {};

    if (allDelivered) {
      orderStatus = OrderStatus.delivered;
      updateData.status = orderStatus;
      updateData.deliveredAt = new Date();
    } else if (anyShipped) {
      orderStatus = OrderStatus.shipped;
      updateData.status = orderStatus;
      updateData.shippedAt = new Date();
    }

    if (orderStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });

      // Collect tracking numbers
      const trackingNumbers = supplierOrders
        .filter(o => o.trackingNumber)
        .map(o => o.trackingNumber as string);

      if (trackingNumbers.length > 0) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { trackingNumbers },
        });
      }
    }
  }

  /**
   * Trigger customer notification
   */
  private async triggerNotification(
    orderId: string,
    status: SupplierOrderStatus,
    trackingNumber: string | undefined
  ): Promise<void> {
    // TODO: Implement email/SMS notification
    logger.info('Notification triggered', {
      orderId,
      status,
      trackingNumber,
      type: status === SupplierOrderStatus.shipped ? 'SHIPMENT_NOTIFICATION' : 'DELIVERY_NOTIFICATION',
    });
  }

  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Types
// ============================================================================

export interface TrackingSyncResult {
  success: boolean;
  message: string;
  processed: number;
  updated: number;
  errors: number;
  durationMs?: number;
}

// ============================================================================
// Factory
// ============================================================================

export function createTrackingSyncJob(
  prisma: PrismaClient,
  aliexpressConfig: AliExpressConfig,
  config?: Partial<TrackingSyncConfig>
): TrackingSyncJob {
  return new TrackingSyncJob(prisma, aliexpressConfig, config);
}
