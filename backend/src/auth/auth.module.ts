import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PatientJwtStrategy } from './patient-jwt.strategy';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtUtil } from '../utils/jwt.util';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PatientJwtStrategy, RefreshTokenService, JwtUtil],
  exports: [AuthService, JwtUtil],
})
export class AuthModule {} 