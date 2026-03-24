import { ProductRepository } from '@domain/ports/outbound/product-repository.port.js';
import { SupplierApi } from '@domain/ports/outbound/supplier-api.port.js';
import { Logger } from '@infrastructure/config/logger.js';

export interface StockSyncJobDependencies {
  productRepository: ProductRepository;
  supplierApi: SupplierApi;
  logger: Logger;
}

export class StockSyncJob {
  private readonly productRepository: ProductRepository;
  private readonly supplierApi: SupplierApi;
  private readonly logger: Logger;

  constructor(deps: StockSyncJobDependencies) {
    this.productRepository = deps.productRepository;
    this.supplierApi = deps.supplierApi;
    this.logger = deps.logger.child({ job: 'StockSyncJob' });
  }

  async execute(): Promise<void> {
    this.logger.info('Starting stock synchronization');

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const productsToSync = await this.productRepository.findNeedingSync(sixHoursAgo);

    this.logger.info(`Found ${productsToSync.length} products to sync`);

    let synced = 0;
    let failed = 0;
    let deactivated = 0;

    for (const product of productsToSync) {
      try {
        const supplierProduct = await this.supplierApi.getProduct(product.aliexpressId);

        if (supplierProduct == null) {
          product.deactivate();
          await this.productRepository.save(product);
          deactivated++;
          this.logger.warn(`Product ${product.id} no longer available from supplier`);
          continue;
        }

        const oldStock = product.stock;
        product.updateStock(supplierProduct.stock);

        if (supplierProduct.price.amount !== product.supplierPrice.amount) {
          const newSellingPrice = this.calculateSellingPrice(supplierProduct.price.amount);
          product.updatePrice(
            supplierProduct.price,
            product.sellingPrice.currency === supplierProduct.price.currency
              ? product.sellingPrice.multiply(newSellingPrice / supplierProduct.price.amount)
              : supplierProduct.price.multiply(1.5)
          );
        }

        product.markSynced();
        await this.productRepository.save(product);
        synced++;

        if (oldStock > 0 && product.stock === 0) {
          this.logger.warn(`Product ${product.id} is now out of stock`);
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to sync product ${product.id}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.info('Stock synchronization completed', {
      total: productsToSync.length,
      synced,
      failed,
      deactivated,
    });
  }

  private calculateSellingPrice(supplierPrice: number): number {
    const minMargin = 1.3;
    return supplierPrice * minMargin;
  }
}
