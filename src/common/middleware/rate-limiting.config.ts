import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

/**
 * General API rate limiting configuration
 * Applies to all API routes except health checks
 */
export const createGeneralRateLimit = (configService: ConfigService) => 
  rateLimit({
    windowMs: configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    max: configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100), // 100 requests per window
    message: {
      error: 'Too many requests from this IP',
      retryAfter: '15 minutes',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
    keyGenerator: (req) => {
      // Use IP address as the key for rate limiting
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  });

/**
 * Authentication endpoint rate limiting configuration
 * Stricter limits for auth endpoints to prevent brute force attacks
 */
export const createAuthRateLimit = (configService: ConfigService) =>
  rateLimit({
    windowMs: configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    max: configService.get<number>('AUTH_RATE_LIMIT_MAX', 5), // 5 auth attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP address as the key for rate limiting
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  });

/**
 * File upload rate limiting configuration
 * Prevents abuse of file upload endpoints
 */
export const createUploadRateLimit = (configService: ConfigService) =>
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: configService.get<number>('UPLOAD_RATE_LIMIT_MAX', 10), // 10 uploads per minute
    message: {
      error: 'Too many file uploads',
      retryAfter: '1 minute',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP address as the key for rate limiting
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  });

/**
 * Strict rate limiting for sensitive operations
 * Used for password reset, account deletion, etc.
 */
export const createStrictRateLimit = (configService: ConfigService) =>
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
      error: 'Too many sensitive operations attempted',
      retryAfter: '1 hour',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP address as the key for rate limiting
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  });
