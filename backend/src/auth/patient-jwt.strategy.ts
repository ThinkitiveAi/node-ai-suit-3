import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PatientTokenPayload } from '../utils/jwt.util';

@Injectable()
export class PatientJwtStrategy extends PassportStrategy(Strategy, 'patient-jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    });
  }

  async validate(payload: PatientTokenPayload) {
    // Check if patient exists and is active
    const patient = await this.prisma.patient.findUnique({
      where: { id: payload.sub },
    });

    if (!patient || !patient.isActive) {
      throw new UnauthorizedException('Patient not found or inactive');
    }

    // Check if email is verified (required for login)
    if (!patient.emailVerified) {
      throw new UnauthorizedException('Email not verified. Please verify your email first.');
    }

    return {
      id: patient.id,
      email: patient.email,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phoneNumber: patient.phoneNumber,
      emailVerified: patient.emailVerified,
      phoneVerified: patient.phoneVerified,
      role: 'patient',
    };
  }
} 