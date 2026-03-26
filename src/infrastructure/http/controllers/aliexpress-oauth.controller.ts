// ============================================================================
// AliExpress OAuth Controller - Callback Handler
// ============================================================================
// Handles the OAuth 2.0 callback from AliExpress Open Platform:
// - Receives authorization code at /api/aliexpress/callback
// - Exchanges code for access token
// - Stores token securely in database
// - Provides status and management endpoints
// ============================================================================

import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  AliExpressOAuthService,
  createAliExpressOAuthService,
} from '@infrastructure/adapters/outbound/external-apis/aliexpress-oauth.service.js';
import { AliExpressDSAdapter, createAliExpressDSAdapter } from '@infrastructure/adapters/outbound/external-apis/aliexpress-ds.adapter.js';
import { logger } from '@infrastructure/config/logger.js';

// ============================================================================
// Controller
// ============================================================================

export class AliExpressOAuthController {
  private readonly oauthService: AliExpressOAuthService;
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient, oauthService?: AliExpressOAuthService) {
    this.prisma = prisma;
    this.oauthService = oauthService ?? createAliExpressOAuthService(prisma);
  }

  // ============================================================================
  // Routes
  // ============================================================================

  /**
   * GET /api/aliexpress/authorize
   * Redirects user to AliExpress authorization page
   */
  async initiateAuthorization(req: Request, res: Response): Promise<void> {
    try {
      // Generate a state parameter for CSRF protection
      const state = this.generateState();

      // Store state in session or temporary storage for validation
      // For simplicity, we'll use a signed cookie
      res.cookie('aliexpress_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000, // 10 minutes
        sameSite: 'lax',
      });

      const authUrl = this.oauthService.getAuthorizationUrl(state);

      logger.info('Initiating AliExpress OAuth flow', {
        redirectUrl: authUrl.substring(0, 100) + '...',
      });

      res.redirect(authUrl);
    } catch (error) {
      logger.error('Failed to initiate OAuth', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to initiate authorization',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/aliexpress/callback
   * Receives authorization code from AliExpress and exchanges it for token
   */
  async handleCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error, error_description } = req.query;

    logger.info('Received AliExpress OAuth callback', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
    });

    // Check for OAuth errors from AliExpress
    if (error) {
      logger.error('AliExpress OAuth error', {
        error,
        errorDescription: error_description,
      });

      res.status(400).json({
        success: false,
        error: 'authorization_failed',
        message: `AliExpress returned an error: ${error}`,
        details: error_description,
      });
      return;
    }

    // Validate authorization code presence
    if (!code || typeof code !== 'string') {
      logger.warn('Missing authorization code in callback');
      res.status(400).json({
        success: false,
        error: 'missing_code',
        message: 'Authorization code is required',
      });
      return;
    }

    // Optional: Validate state parameter for CSRF protection
    const storedState = req.cookies?.aliexpress_oauth_state;
    if (storedState && state !== storedState) {
      logger.warn('OAuth state mismatch', {
        received: state,
        expected: storedState,
      });
      res.status(400).json({
        success: false,
        error: 'invalid_state',
        message: 'State parameter mismatch. Possible CSRF attack.',
      });
      return;
    }

    // Clear the state cookie
    res.clearCookie('aliexpress_oauth_state');

    try {
      // Exchange authorization code for access token
      logger.info('Exchanging authorization code for token');
      const tokenResponse = await this.oauthService.exchangeCodeForToken(code);

      // Save token securely to database
      logger.info('Saving token to database');
      await this.oauthService.saveToken(tokenResponse);

      // Log success for audit
      await this.prisma.auditLog.create({
        data: {
          action: 'ALIEXPRESS_OAUTH_SUCCESS',
          entity: 'AliExpressCredential',
          entityId: tokenResponse.userId,
          changes: {
            userNick: tokenResponse.userNick,
            expiresAt: tokenResponse.accessTokenExpiresAt.toISOString(),
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info('AliExpress OAuth completed successfully', {
        userId: tokenResponse.userId,
        userNick: tokenResponse.userNick,
        expiresAt: tokenResponse.accessTokenExpiresAt.toISOString(),
      });

      // Return success response
      // In production, you might want to redirect to a success page
      res.status(200).json({
        success: true,
        message: 'Authorization successful! Access token has been securely stored.',
        data: {
          userId: tokenResponse.userId,
          userNick: tokenResponse.userNick,
          tokenType: tokenResponse.tokenType,
          expiresAt: tokenResponse.accessTokenExpiresAt.toISOString(),
          refreshExpiresAt: tokenResponse.refreshTokenExpiresAt.toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to complete OAuth flow', {
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Log failure for audit
      await this.prisma.auditLog.create({
        data: {
          action: 'ALIEXPRESS_OAUTH_FAILED',
          entity: 'AliExpressCredential',
          changes: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(500).json({
        success: false,
        error: 'token_exchange_failed',
        message: 'Failed to exchange authorization code for token',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/aliexpress/status
   * Check current credential status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.oauthService.getCredentialStatus();

      res.status(200).json({
        success: true,
        data: {
          configured: status.exists,
          active: status.isActive,
          expired: status.isExpired,
          needsRefresh: status.needsRefresh,
          expiresAt: status.expiresAt?.toISOString() ?? null,
          lastUsed: status.lastUsedAt?.toISOString() ?? null,
          lastError: status.lastError,
          account: status.userNick
            ? {
                userId: status.userId,
                userNick: status.userNick,
              }
            : null,
        },
      });
    } catch (error) {
      logger.error('Failed to get credential status', { error });
      res.status(500).json({
        success: false,
        error: 'status_check_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/aliexpress/refresh
   * Manually trigger token refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual token refresh requested');

      const accessToken = await this.oauthService.getValidAccessToken();

      // Get updated status
      const status = await this.oauthService.getCredentialStatus();

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          expiresAt: status.expiresAt?.toISOString() ?? null,
          tokenPreview: `${accessToken.substring(0, 8)}...`,
        },
      });
    } catch (error) {
      logger.error('Token refresh failed', { error });
      res.status(500).json({
        success: false,
        error: 'refresh_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/aliexpress/revoke
   * Revoke stored credentials
   */
  async revokeCredentials(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Credential revocation requested');

      await this.oauthService.revokeCredentials();

      await this.prisma.auditLog.create({
        data: {
          action: 'ALIEXPRESS_CREDENTIALS_REVOKED',
          entity: 'AliExpressCredential',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Credentials revoked successfully',
      });
    } catch (error) {
      logger.error('Credential revocation failed', { error });
      res.status(500).json({
        success: false,
        error: 'revocation_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/aliexpress/test
   * Non-destructive connectivity test against AliExpress APIs
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = await this.oauthService.getValidAccessToken();

      const adapter = new AliExpressDSAdapter({
        appKey: process.env.ALIEXPRESS_APP_KEY ?? '',
        appSecret: process.env.ALIEXPRESS_APP_SECRET ?? '',
        getAccessToken: async () => accessToken,
        trackingId: process.env.ALIEXPRESS_TRACKING_ID ?? '',
      });

      // Test connection by fetching categories
      const connectionResult = await adapter.testConnection();

      res.status(200).json({
        success: connectionResult.success,
        message: connectionResult.message,
        data: {
          tokenPreview: `${accessToken.substring(0, 8)}...`,
          gateway: connectionResult.details?.gateway,
          categoriesCount: connectionResult.details?.categoriesCount,
        },
      });
    } catch (error) {
      logger.error('AliExpress API test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'test_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/aliexpress/test-ds
   * Test the new DS (Dropshipping Solution) API adapter
   * This uses the correct Open Platform gateway and SHA256 signatures
   */
  async testDSConnection(req: Request, res: Response): Promise<void> {
    const productId = (req.query.product_id as string) ?? '1005004000000000';

    try {
      logger.info('Testing DS API connection', { productId });

      // Create DS adapter with OAuth token provider
      const dsAdapter = createAliExpressDSAdapter(
        () => this.oauthService.getValidAccessToken()
      );

      // Test 1: Connection test (fetches categories)
      const connectionTest = await dsAdapter.testConnection();

      if (!connectionTest.success) {
        res.status(500).json({
          success: false,
          error: 'ds_connection_failed',
          message: connectionTest.message,
          details: {
            gateway: connectionTest.details?.gateway,
            appKey: connectionTest.details?.appKey,
            error: connectionTest.error,
          },
          recommendation: 'Verify your app has DS Center permissions enabled',
        });
        return;
      }

      // Test 2: Fetch a product (optional, only if product_id provided)
      let productTest = null;
      if (productId !== '1005004000000000') {
        productTest = await dsAdapter.testProductFetch(productId);
      }

      res.status(200).json({
        success: true,
        message: 'AliExpress DS API connection successful!',
        data: {
          connectionTest: {
            gateway: connectionTest.details?.gateway,
            appKey: connectionTest.details?.appKey,
            categoriesCount: connectionTest.details?.categoriesCount,
            sampleCategories: connectionTest.details?.sampleCategories,
          },
          productTest: productTest ?? 'Skipped (use ?product_id=xxx to test)',
        },
        migration: {
          status: 'DS Adapter Ready',
          oldGateway: 'https://eco.taobao.com/router/rest',
          newGateway: 'https://api-sg.aliexpress.com/sync',
          signatureMethod: 'HMAC-SHA256',
        },
      });
    } catch (error) {
      logger.error('DS API test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'ds_test_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: {
          step1: 'Verify OAuth token is valid: GET /api/aliexpress/status',
          step2: 'Check app permissions in AliExpress Open Platform console',
          step3: 'Ensure app is enrolled in DS Center',
          documentation: 'https://openservice.aliexpress.com/doc/api.htm',
        },
      });
    }
  }

  /**
   * GET /api/aliexpress/debug-raw
   * Debug endpoint - returns raw API response
   * Usage: ?method=aliexpress.ds.product.get&product_id=xxx
   */
  async debugRawRequest(req: Request, res: Response): Promise<void> {
    const method = (req.query.method as string) ?? 'aliexpress.ds.category.get';
    const productId = req.query.product_id as string;

    try {
      logger.info('Debug raw API request', { method, productId });

      const dsAdapter = createAliExpressDSAdapter(
        () => this.oauthService.getValidAccessToken()
      );

      // Build params based on method
      let bizParams: Record<string, unknown> = {};
      if (method === 'aliexpress.ds.product.get' && productId) {
        bizParams = {
          product_id: productId,
          ship_to_country: 'FR',
          target_currency: 'EUR',
          target_language: 'EN',
        };
      } else if (method === 'aliexpress.ds.recommend.feed.get') {
        const feedName = (req.query.feed_name as string) ?? 'DS_France_topsellers';
        bizParams = {
          feed_name: feedName,
          country: 'FR',
          target_currency: 'EUR',
          target_language: 'EN',
          page_no: req.query.page ?? 1,
          page_size: req.query.page_size ?? 10,
        };
      }

      const rawResponse = await dsAdapter.executeRawRequest(method, bizParams);

      res.status(200).json({
        success: true,
        method,
        params: bizParams,
        rawResponse,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    for (let i = 0; i < 32; i++) {
      state += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return state;
  }
}

// ============================================================================
// Router Factory
// ============================================================================

export function createAliExpressOAuthRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new AliExpressOAuthController(prisma);

  // OAuth flow endpoints
  router.get('/authorize', (req, res) => controller.initiateAuthorization(req, res));
  router.get('/callback', (req, res) => controller.handleCallback(req, res));

  // Management endpoints
  router.get('/status', (req, res) => controller.getStatus(req, res));
  router.get('/test', (req, res) => controller.testConnection(req, res));
  router.get('/test-ds', (req, res) => controller.testDSConnection(req, res));
  router.get('/debug-raw', (req, res) => controller.debugRawRequest(req, res));
  router.post('/refresh', (req, res) => controller.refreshToken(req, res));
  router.delete('/revoke', (req, res) => controller.revokeCredentials(req, res));

  return router;
}

// ============================================================================
// Express App Integration Example
// ============================================================================
/*
import express from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { createAliExpressOAuthRouter } from './aliexpress-oauth.controller';

const app = express();
const prisma = new PrismaClient();

// Required for state cookie
app.use(cookieParser());

// Mount AliExpress OAuth routes
app.use('/api/aliexpress', createAliExpressOAuthRouter(prisma));

// Callback URL configured in AliExpress: https://your-domain.com/api/aliexpress/callback
*/
