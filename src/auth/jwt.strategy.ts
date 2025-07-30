import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPayload } from '../utils/jwt.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    });
  }

  async validate(payload: TokenPayload) {
    // Check if provider exists and is active
    const provider = await this.prisma.provider.findUnique({
      where: { id: payload.provider_id },
    });

    if (!provider || !provider.isActive) {
      throw new UnauthorizedException('Provider not found or inactive');
    }

    // Check if account is locked
    if (provider.lockedUntil && provider.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked due to failed login attempts');
    }

    // Check if account is verified
    if (provider.verificationStatus !== 'verified') {
      throw new UnauthorizedException('Account not verified');
    }

    return {
      id: provider.id,
      email: provider.email,
      firstName: provider.firstName,
      lastName: provider.lastName,
      specialization: provider.specialization,
      verificationStatus: provider.verificationStatus,
      isActive: provider.isActive,
    };
  }
} 