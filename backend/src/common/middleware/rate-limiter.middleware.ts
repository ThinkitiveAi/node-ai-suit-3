import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly MAX_REQUESTS = 5; // 5 attempts per hour

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    const entry = this.rateLimitMap.get(ip);

    if (!entry) {
      // First request from this IP
      this.rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return next();
    }

    if (now > entry.resetTime) {
      // Window expired, reset
      this.rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return next();
    }

    if (entry.count >= this.MAX_REQUESTS) {
      throw new HttpException(
        {
          success: false,
          message: 'Too many registration attempts. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    entry.count++;
    this.rateLimitMap.set(ip, entry);

    next();
  }

  private cleanupExpiredEntries(now: number) {
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(ip);
      }
    }
  }
} 