import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface LoginAttemptEntry {
  count: number;
  resetTime: number;
  lastAttempt: number;
}

@Injectable()
export class LoginRateLimiterMiddleware implements NestMiddleware {
  private readonly loginAttemptsMap = new Map<string, LoginAttemptEntry>();
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_ATTEMPTS = 5; // 5 attempts per 15 minutes

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    const entry = this.loginAttemptsMap.get(ip);

    if (!entry) {
      // First attempt from this IP
      this.loginAttemptsMap.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
        lastAttempt: now,
      });
      return next();
    }

    if (now > entry.resetTime) {
      // Window expired, reset
      this.loginAttemptsMap.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
        lastAttempt: now,
      });
      return next();
    }

    if (entry.count >= this.MAX_ATTEMPTS) {
      const timeLeft = Math.ceil((entry.resetTime - now) / 1000 / 60);
      throw new HttpException(
        {
          success: false,
          message: `Too many login attempts. Please try again in ${timeLeft} minutes.`,
          error: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    entry.count++;
    entry.lastAttempt = now;
    this.loginAttemptsMap.set(ip, entry);

    next();
  }

  private cleanupExpiredEntries(now: number) {
    for (const [ip, entry] of this.loginAttemptsMap.entries()) {
      if (now > entry.resetTime) {
        this.loginAttemptsMap.delete(ip);
      }
    }
  }

  // Method to reset attempts for successful login
  resetAttempts(ip: string) {
    this.loginAttemptsMap.delete(ip);
  }
} 