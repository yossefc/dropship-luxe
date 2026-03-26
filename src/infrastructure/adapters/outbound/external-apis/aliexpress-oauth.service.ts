// ============================================================================
// AliExpress OAuth Service - Secure Token Management
// ============================================================================
// Handles OAuth 2.0 flow with AliExpress Open Platform:
// - Authorization code exchange for access token
// - Token refresh when expired
// - Secure storage with AES-256 encryption
// - Automatic token rotation
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';
import { CryptoService } from '@shared/utils/crypto.js';
import { logger } from '@infrastructure/config/logger.js';
import { ExternalServiceError } from '@shared/errors/domain-error.js';

// ============================================================================
// Configuration
// ============================================================================

export interface AliExpressOAuthConfig {
  appKey: string;
  appSecret: string;
  redirectUri: string;
  baseUrl?: string;
}

// ============================================================================
// Types
// ============================================================================

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  tokenType: string;
  userId: string;
  userNick: string;
  sellerAccountId?: string;
  scope?: string;
}

interface AliExpressTokenApiResponse {
  access_token?: string;
  refresh_token?: string;
  expire_time?: number;        // Unix timestamp in milliseconds
  refresh_token_valid_time?: number;
  refresh_expires_in?: number;
  token_type?: string;
  user_id?: string;
  user_nick?: string;
  seller_id?: string;
  account_id?: string;
  sp?: string;                 // Seller account identifier
  locale?: string;
  error_code?: string;
  error_msg?: string;
  code?: string;
  message?: string;
  request_id?: string;
  // Alternative field names used by some API versions
  expires_in?: number;         // Seconds until expiration
  r1_expires_in?: number;      // Refresh token expiration in seconds
  account?: string;
}

// ============================================================================
// AliExpress OAuth Service
// ============================================================================

export class AliExpressOAuthService {
  private readonly client: AxiosInstance;
  private readonly config: AliExpressOAuthConfig;
  private readonly prisma: PrismaClient;
  private readonly crypto: CryptoService;

  constructor(
    config: AliExpressOAuthConfig,
    prisma: PrismaClient,
    encryptionKey: string
  ) {
    this.config = config;
    this.prisma = prisma;
    this.crypto = new CryptoService(encryptionKey);

    // AliExpress OAuth endpoints
    // Documentation: https://openservice.aliexpress.com/doc/doc.htm?nodeId=27493&docId=118729
    this.client = axios.create({
      baseURL: config.baseUrl ?? 'https://api-sg.aliexpress.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  // ============================================================================
  // OAuth Flow
  // ============================================================================

  private buildSignedParams(
    apiName: string,
    businessParams: Record<string, string>
  ): Record<string, string> {
    const params: Record<string, string> = {
      app_key: this.config.appKey,
      sign_method: 'sha256',
      timestamp: Date.now().toString(),
      ...businessParams,
    };

    const sortedKeys = Object.keys(params).sort();
    const signPayload = apiName + sortedKeys.map((key) => `${key}${params[key]}`).join('');
    const sign = CryptoService.generateHmacSha256(signPayload, this.config.appSecret).toUpperCase();

    return {
      ...params,
      sign,
    };
  }

  /**
   * Generate the authorization URL for OAuth flow
   * Redirect user to this URL to initiate authorization
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.appKey,
      redirect_uri: this.config.redirectUri,
      sp: 'ae',  // AliExpress platform identifier
      view: 'web',
      force_auth: 'true',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://api-sg.aliexpress.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called when AliExpress redirects back to callback URL with auth_code
   */
  async exchangeCodeForToken(authCode: string): Promise<TokenResponse> {
    logger.info('Exchanging authorization code for access token', {
      codePreview: `${authCode.substring(0, 8)}...`,
    });

    try {
      const requestParams = this.buildSignedParams('/auth/token/create', {
        code: authCode,
        app_secret: this.config.appSecret,
      });

      // Make the token exchange request
      const response = await this.client.post<AliExpressTokenApiResponse>(
        '/rest/auth/token/create',
        null,
        {
          params: requestParams,
        }
      );

      const data = response.data;

      // Check for errors
      if ((data.error_code != null && data.error_code !== '') || (data.code != null && data.code !== '0')) {
        logger.error('AliExpress token exchange failed', {
          errorCode: data.error_code,
          errorMsg: data.error_msg,
          code: data.code,
          message: data.message,
          requestId: data.request_id,
        });
        throw new ExternalServiceError(
          'AliExpress OAuth',
          `Token exchange failed: ${data.error_code ?? data.code} - ${data.error_msg ?? data.message ?? 'Unknown error'}`
        );
      }

      // Validate response
      if (!data.access_token) {
        logger.error('AliExpress token response missing access token', {
          responseKeys: Object.keys(data),
          code: data.code,
          message: data.message,
          requestId: data.request_id,
        });
        throw new ExternalServiceError(
          'AliExpress OAuth',
          'Token response missing access_token'
        );
      }

      // Parse expiration times
      const now = Date.now();
      let accessTokenExpiresAt: Date;
      let refreshTokenExpiresAt: Date;

      if (data.expire_time) {
        // expire_time is Unix timestamp in milliseconds
        accessTokenExpiresAt = new Date(data.expire_time);
      } else if (data.expires_in) {
        // expires_in is seconds from now
        accessTokenExpiresAt = new Date(now + data.expires_in * 1000);
      } else {
        // Default: 10 days (AliExpress typical)
        accessTokenExpiresAt = new Date(now + 10 * 24 * 60 * 60 * 1000);
      }

      if (data.refresh_token_valid_time) {
        refreshTokenExpiresAt = new Date(data.refresh_token_valid_time);
      } else if (data.refresh_expires_in) {
        refreshTokenExpiresAt = new Date(now + data.refresh_expires_in * 1000);
      } else if (data.r1_expires_in) {
        refreshTokenExpiresAt = new Date(now + data.r1_expires_in * 1000);
      } else {
        // Default: 30 days
        refreshTokenExpiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000);
      }

      const tokenResponse: TokenResponse = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? '',
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        tokenType: data.token_type ?? 'Bearer',
        userId: data.seller_id ?? data.user_id ?? data.account_id ?? data.account ?? '',
        userNick: data.user_nick ?? '',
      };

      // Only add optional properties if they have values
      const sellerAccountId = data.seller_id ?? data.account_id ?? data.sp;
      if (sellerAccountId !== undefined) tokenResponse.sellerAccountId = sellerAccountId;
      if (data.locale !== undefined) tokenResponse.scope = data.locale;

      logger.info('Successfully obtained access token', {
        userId: tokenResponse.userId,
        userNick: tokenResponse.userNick,
        expiresAt: tokenResponse.accessTokenExpiresAt.toISOString(),
      });

      return tokenResponse;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        logger.error('AliExpress API request failed', {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new ExternalServiceError(
          'AliExpress OAuth',
          `API request failed: ${error.message}`
        );
      }

      throw new ExternalServiceError(
        'AliExpress OAuth',
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    logger.info('Refreshing access token');

    try {
      const requestParams = this.buildSignedParams('/auth/token/refresh', {
        refresh_token: refreshToken,
        app_secret: this.config.appSecret,
      });

      const response = await this.client.post<AliExpressTokenApiResponse>(
        '/rest/auth/token/refresh',
        null,
        {
          params: requestParams,
        }
      );

      const data = response.data;

      if ((data.error_code != null && data.error_code !== '') || (data.code != null && data.code !== '0')) {
        throw new ExternalServiceError(
          'AliExpress OAuth',
          `Token refresh failed: ${data.error_code ?? data.code} - ${data.error_msg ?? data.message ?? 'Unknown error'}`
        );
      }

      if (!data.access_token) {
        throw new ExternalServiceError(
          'AliExpress OAuth',
          'Refresh response missing access_token'
        );
      }

      const now = Date.now();
      const accessTokenExpiresAt = data.expire_time
        ? new Date(data.expire_time)
        : new Date(now + 10 * 24 * 60 * 60 * 1000);

      const refreshTokenExpiresAt = data.refresh_token_valid_time
        ? new Date(data.refresh_token_valid_time)
        : data.refresh_expires_in
          ? new Date(now + data.refresh_expires_in * 1000)
        : new Date(now + 30 * 24 * 60 * 60 * 1000);

      const refreshedToken: TokenResponse = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        tokenType: data.token_type ?? 'Bearer',
        userId: data.seller_id ?? data.user_id ?? data.account_id ?? data.account ?? '',
        userNick: data.user_nick ?? '',
      };

      // Only add optional property if it has a value
      const sellerAccountId = data.seller_id ?? data.account_id ?? data.sp;
      if (sellerAccountId !== undefined) refreshedToken.sellerAccountId = sellerAccountId;

      return refreshedToken;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'AliExpress OAuth',
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  // ============================================================================
  // Secure Storage
  // ============================================================================

  /**
   * Save token securely to database (AES-256 encrypted)
   */
  async saveToken(
    token: TokenResponse,
    credentialName: string = 'primary'
  ): Promise<void> {
    logger.info('Saving encrypted token to database', {
      credentialName,
      userId: token.userId,
    });

    // Encrypt sensitive data
    const accessTokenEncrypted = this.crypto.encryptAES256(token.accessToken);
    const refreshTokenEncrypted = token.refreshToken
      ? this.crypto.encryptAES256(token.refreshToken)
      : null;

    // Upsert the credential
    // Convert undefined to null for Prisma compatibility
    const sellerAccountId = token.sellerAccountId ?? null;
    const scope = token.scope ?? null;

    await this.prisma.aliExpressCredential.upsert({
      where: { name: credentialName },
      create: {
        name: credentialName,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenType: token.tokenType,
        expiresAt: token.accessTokenExpiresAt,
        refreshExpiresAt: token.refreshTokenExpiresAt,
        aliexpressUserId: token.userId,
        aliexpressUserNick: token.userNick,
        sellerAccountId,
        scope,
        isActive: true,
        lastRefreshedAt: new Date(),
      },
      update: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenType: token.tokenType,
        expiresAt: token.accessTokenExpiresAt,
        refreshExpiresAt: token.refreshTokenExpiresAt,
        aliexpressUserId: token.userId,
        aliexpressUserNick: token.userNick,
        sellerAccountId,
        scope,
        isActive: true,
        lastError: null,
        lastRefreshedAt: new Date(),
      },
    });

    logger.info('Token saved successfully', { credentialName });
  }

  /**
   * Retrieve and decrypt the current access token
   */
  async getActiveToken(credentialName: string = 'primary'): Promise<{
    accessToken: string;
    expiresAt: Date | null;
    isExpired: boolean;
    needsRefresh: boolean;
  } | null> {
    const credential = await this.prisma.aliExpressCredential.findUnique({
      where: { name: credentialName },
    });

    if (!credential || !credential.isActive) {
      return null;
    }

    // Decrypt the access token
    const accessToken = this.crypto.decryptAES256(credential.accessTokenEncrypted);

    // Check expiration status
    const now = new Date();
    const expiresAt = credential.expiresAt;
    const isExpired = expiresAt ? now >= expiresAt : false;

    // Need refresh if expiring within 1 hour
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const needsRefresh = expiresAt ? oneHourFromNow >= expiresAt : false;

    // Update last used timestamp
    await this.prisma.aliExpressCredential.update({
      where: { name: credentialName },
      data: { lastUsedAt: now },
    });

    return {
      accessToken,
      expiresAt,
      isExpired,
      needsRefresh,
    };
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(credentialName: string = 'primary'): Promise<string> {
    const credential = await this.prisma.aliExpressCredential.findUnique({
      where: { name: credentialName },
    });

    if (!credential || !credential.isActive) {
      throw new ExternalServiceError(
        'AliExpress OAuth',
        'No active credentials found. Please complete OAuth authorization.'
      );
    }

    // Check if token needs refresh
    const now = new Date();
    const needsRefresh = credential.expiresAt
      ? new Date(now.getTime() + 60 * 60 * 1000) >= credential.expiresAt
      : false;

    if (needsRefresh && credential.refreshTokenEncrypted) {
      // Refresh the token
      try {
        const refreshToken = this.crypto.decryptAES256(credential.refreshTokenEncrypted);
        const newToken = await this.refreshAccessToken(refreshToken);
        await this.saveToken(newToken, credentialName);
        return newToken.accessToken;
      } catch (error) {
        logger.error('Failed to refresh token', {
          credentialName,
          error: error instanceof Error ? error.message : 'Unknown',
        });

        // Mark credential with error
        await this.prisma.aliExpressCredential.update({
          where: { name: credentialName },
          data: {
            lastError: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown'}`,
          },
        });

        // If refresh failed but token not yet expired, return existing token
        if (credential.expiresAt && now < credential.expiresAt) {
          return this.crypto.decryptAES256(credential.accessTokenEncrypted);
        }

        throw new ExternalServiceError(
          'AliExpress OAuth',
          'Token expired and refresh failed. Please re-authorize.'
        );
      }
    }

    // Update last used and return decrypted token
    await this.prisma.aliExpressCredential.update({
      where: { name: credentialName },
      data: { lastUsedAt: now },
    });

    return this.crypto.decryptAES256(credential.accessTokenEncrypted);
  }

  /**
   * Revoke/deactivate credentials
   */
  async revokeCredentials(credentialName: string = 'primary'): Promise<void> {
    await this.prisma.aliExpressCredential.update({
      where: { name: credentialName },
      data: {
        isActive: false,
        lastError: 'Manually revoked',
      },
    });

    logger.info('Credentials revoked', { credentialName });
  }

  /**
   * Check credential status
   */
  async getCredentialStatus(credentialName: string = 'primary'): Promise<{
    exists: boolean;
    isActive: boolean;
    isExpired: boolean;
    needsRefresh: boolean;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    lastError: string | null;
    userId: string | null;
    userNick: string | null;
  }> {
    const credential = await this.prisma.aliExpressCredential.findUnique({
      where: { name: credentialName },
    });

    if (!credential) {
      return {
        exists: false,
        isActive: false,
        isExpired: true,
        needsRefresh: true,
        expiresAt: null,
        lastUsedAt: null,
        lastError: null,
        userId: null,
        userNick: null,
      };
    }

    const now = new Date();
    const isExpired = credential.expiresAt ? now >= credential.expiresAt : false;
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const needsRefresh = credential.expiresAt ? oneHourFromNow >= credential.expiresAt : false;

    return {
      exists: true,
      isActive: credential.isActive,
      isExpired,
      needsRefresh,
      expiresAt: credential.expiresAt,
      lastUsedAt: credential.lastUsedAt,
      lastError: credential.lastError,
      userId: credential.aliexpressUserId,
      userNick: credential.aliexpressUserNick,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAliExpressOAuthService(
  prisma: PrismaClient
): AliExpressOAuthService {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;
  const redirectUri = process.env.ALIEXPRESS_CALLBACK_URL;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!appKey || !appSecret) {
    throw new Error('Missing ALIEXPRESS_APP_KEY or ALIEXPRESS_APP_SECRET in environment');
  }

  if (!redirectUri) {
    throw new Error('Missing ALIEXPRESS_CALLBACK_URL in environment');
  }

  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (256 bits)');
  }

  return new AliExpressOAuthService(
    {
      appKey,
      appSecret,
      redirectUri,
    },
    prisma,
    encryptionKey
  );
}
