import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface PatientRegistrationEntry {
  count: number;
  resetTime: number;
  lastAttempt: number;
}

@Injectable()
export class PatientRateLimiterMiddleware implements NestMiddleware {
  private readonly patientRegistrationsMap = new Map<string, PatientRegistrationEntry>();
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly MAX_REGISTRATIONS = 3; // 3 registrations per hour

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    const entry = this.patientRegistrationsMap.get(ip);

    if (!entry) {
      // First registration attempt from this IP
      this.patientRegistrationsMap.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
        lastAttempt: now,
      });
      return next();
    }

    if (now > entry.resetTime) {
      // Window expired, reset
      this.patientRegistrationsMap.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
        lastAttempt: now,
      });
      return next();
    }

    if (entry.count >= this.MAX_REGISTRATIONS) {
      const timeLeft = Math.ceil((entry.resetTime - now) / 1000 / 60);
      throw new HttpException(
        {
          success: false,
          message: `Too many patient registration attempts. Please try again in ${timeLeft} minutes.`,
          error: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment count
    entry.count++;
    entry.lastAttempt = now;
    this.patientRegistrationsMap.set(ip, entry);

    next();
  }

  private cleanupExpiredEntries(now: number) {
    for (const [ip, entry] of this.patientRegistrationsMap.entries()) {
      if (now > entry.resetTime) {
        this.patientRegistrationsMap.delete(ip);
      }
    }
  }

  // Method to reset attempts for successful registration
  resetAttempts(ip: string) {
    this.patientRegistrationsMap.delete(ip);
  }
} 