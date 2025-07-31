import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomBytes, createHash } from 'crypto';
import { TokenType } from '../../generated/prisma';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createEmailVerificationToken(patientId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.verificationToken.create({
      data: {
        token: hashedToken,
        type: TokenType.email,
        patientId,
        expiresAt,
      },
    });

    return token;
  }

  async sendVerificationEmail(patientId: string, email: string): Promise<boolean> {
    try {
      const token = await this.createEmailVerificationToken(patientId);
      
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}&patient_id=${patientId}`;
      
      await this.mailService.sendVerificationEmail(email, verificationUrl);
      
      this.logger.log(`Verification email sent to ${email} for patient ${patientId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }

  async verifyEmailToken(token: string, patientId: string): Promise<boolean> {
    try {
      const hashedToken = this.hashToken(token);
      
      const verificationToken = await this.prisma.verificationToken.findFirst({
        where: {
          token: hashedToken,
          type: TokenType.email,
          patientId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!verificationToken) {
        return false;
      }

      // Update patient email verification status
      await this.prisma.patient.update({
        where: { id: patientId },
        data: { emailVerified: true },
      });

      // Delete the used token
      await this.prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      this.logger.log(`Email verified for patient ${patientId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify email token for patient ${patientId}:`, error);
      return false;
    }
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
      
      this.logger.log('Expired verification tokens cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
    }
  }
} 