import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { TokenType } from '../../generated/prisma';

interface OTPAttempt {
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  private readonly otpAttempts = new Map<string, OTPAttempt>();
  
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCKOUT_MINUTES = 15;

  constructor(private readonly prisma: PrismaService) {}

  private hashOTP(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isPhoneLocked(phoneNumber: string): boolean {
    const attempt = this.otpAttempts.get(phoneNumber);
    if (!attempt) return false;
    
    if (attempt.lockedUntil && new Date() < attempt.lockedUntil) {
      return true;
    }
    
    return false;
  }

  private recordOTPAttempt(phoneNumber: string): void {
    const attempt = this.otpAttempts.get(phoneNumber) || { attempts: 0, lastAttempt: new Date() };
    attempt.attempts++;
    attempt.lastAttempt = new Date();
    
    if (attempt.attempts >= this.MAX_ATTEMPTS) {
      attempt.lockedUntil = new Date(Date.now() + this.LOCKOUT_MINUTES * 60 * 1000);
    }
    
    this.otpAttempts.set(phoneNumber, attempt);
  }

  private resetOTPAttempts(phoneNumber: string): void {
    this.otpAttempts.delete(phoneNumber);
  }

  async createPhoneVerificationOTP(patientId: string, phoneNumber: string): Promise<string> {
    if (this.isPhoneLocked(phoneNumber)) {
      throw new Error('Phone number is temporarily locked due to too many attempts');
    }

    const otp = this.generateOTP();
    const hashedOTP = this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.verificationToken.create({
      data: {
        token: hashedOTP,
        type: TokenType.phone,
        patientId,
        expiresAt,
      },
    });

    this.resetOTPAttempts(phoneNumber);
    return otp;
  }

  async sendVerificationSMS(patientId: string, phoneNumber: string): Promise<boolean> {
    try {
      const otp = await this.createPhoneVerificationOTP(patientId, phoneNumber);
      
      // Simulate SMS sending (replace with actual Twilio integration)
      const smsSent = await this.simulateSMSSending(phoneNumber, otp);
      
      if (smsSent) {
        this.logger.log(`Verification SMS sent to ${phoneNumber} for patient ${patientId}`);
        return true;
      } else {
        this.logger.error(`Failed to send verification SMS to ${phoneNumber}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send verification SMS to ${phoneNumber}:`, error);
      return false;
    }
  }

  async verifyPhoneOTP(otp: string, patientId: string): Promise<boolean> {
    try {
      const hashedOTP = this.hashOTP(otp);
      
      const verificationToken = await this.prisma.verificationToken.findFirst({
        where: {
          token: hashedOTP,
          type: TokenType.phone,
          patientId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!verificationToken) {
        return false;
      }

      // Update patient phone verification status
      await this.prisma.patient.update({
        where: { id: patientId },
        data: { phoneVerified: true },
      });

      // Delete the used token
      await this.prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      this.logger.log(`Phone verified for patient ${patientId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify phone OTP for patient ${patientId}:`, error);
      return false;
    }
  }

  async verifyOTPWithRateLimit(otp: string, patientId: string, phoneNumber: string): Promise<boolean> {
    if (this.isPhoneLocked(phoneNumber)) {
      throw new Error('Phone number is temporarily locked due to too many attempts');
    }

    const isValid = await this.verifyPhoneOTP(otp, patientId);
    
    if (!isValid) {
      this.recordOTPAttempt(phoneNumber);
    } else {
      this.resetOTPAttempts(phoneNumber);
    }

    return isValid;
  }

  private async simulateSMSSending(phoneNumber: string, otp: string): Promise<boolean> {
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, replace this with actual Twilio integration
    this.logger.log(`[SIMULATION] SMS sent to ${phoneNumber}: Your verification code is ${otp}`);
    
    return true;
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      await this.prisma.verificationToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      
      this.logger.log('Expired phone verification tokens cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup expired phone tokens:', error);
    }
  }

  getOTPStatus(phoneNumber: string): { attempts: number; locked: boolean; lockTimeLeft?: number } {
    const attempt = this.otpAttempts.get(phoneNumber);
    if (!attempt) {
      return { attempts: 0, locked: false };
    }

    const locked = this.isPhoneLocked(phoneNumber);
    let lockTimeLeft: number | undefined;
    
    if (locked && attempt.lockedUntil) {
      lockTimeLeft = Math.max(0, attempt.lockedUntil.getTime() - Date.now());
    }

    return {
      attempts: attempt.attempts,
      locked,
      lockTimeLeft,
    };
  }
} 