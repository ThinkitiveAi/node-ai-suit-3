import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUtil } from '../utils/jwt.util';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtUtil: JwtUtil,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createRefreshToken(providerId: string, rememberMe: boolean = false): Promise<string> {
    const token = this.jwtUtil.generateRefreshToken(providerId, rememberMe);
    const tokenHash = this.hashToken(token);
    const decoded = this.jwtUtil.decodeToken(token) as any;

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        providerId,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    this.logger.log(`Refresh token created for provider ${providerId}`);
    return token;
  }

  async validateRefreshToken(token: string): Promise<{ valid: boolean; providerId?: string; tokenId?: string }> {
    try {
      const decoded = this.jwtUtil.verifyRefreshToken(token);
      const tokenHash = this.hashToken(token);

      const refreshToken = await this.prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          providerId: decoded.provider_id,
          isRevoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!refreshToken) {
        return { valid: false };
      }

      return {
        valid: true,
        providerId: decoded.provider_id,
        tokenId: refreshToken.id,
      };
    } catch (error) {
      this.logger.warn('Invalid refresh token:', error.message);
      return { valid: false };
    }
  }

  async rotateRefreshToken(oldToken: string, providerId: string, rememberMe: boolean = false): Promise<string> {
    const tokenHash = this.hashToken(oldToken);

    // Revoke the old token
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        providerId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // Create new token
    const newToken = await this.createRefreshToken(providerId, rememberMe);
    
    this.logger.log(`Refresh token rotated for provider ${providerId}`);
    return newToken;
  }

  async revokeRefreshToken(token: string, providerId: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        providerId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    this.logger.log(`Refresh token revoked for provider ${providerId}`);
  }

  async revokeAllRefreshTokens(providerId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        providerId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    this.logger.log(`All refresh tokens revoked for provider ${providerId}`);
  }

  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
    }
  }
} 