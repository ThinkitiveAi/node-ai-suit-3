import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { LockedException } from '../common/exceptions/locked.exception';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUtil, TokenPayload, TokenResponse, PatientTokenPayload, PatientTokenResponse } from '../utils/jwt.util';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordUtil } from '../utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PatientLoginDto } from './dto/patient-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtUtil: JwtUtil,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async login(loginDto: LoginDto, clientIp: string): Promise<TokenResponse> {
    const { identifier, password, remember_me } = loginDto;

    // Find provider by email or phone number
    const provider = await this.prisma.provider.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
        ],
      },
    });

    if (!provider) {
      this.logFailedLoginAttempt(identifier, clientIp, 'Provider not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!provider.isActive) {
      this.logFailedLoginAttempt(identifier, clientIp, 'Account inactive');
      throw new ForbiddenException('Account is inactive');
    }

    // Check if account is verified
    if (provider.verificationStatus !== 'verified') {
      this.logFailedLoginAttempt(identifier, clientIp, 'Account not verified');
      throw new ForbiddenException('Account not verified. Please verify your email first.');
    }

    // Check if account is locked
    if (provider.lockedUntil && provider.lockedUntil > new Date()) {
      const lockTimeLeft = Math.ceil((provider.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      this.logFailedLoginAttempt(identifier, clientIp, 'Account locked');
      throw new LockedException(`Account is locked due to failed login attempts. Please try again in ${lockTimeLeft} minutes.`);
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.verifyPassword(password, provider.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(provider.id, clientIp);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(provider.id);

    // Update login statistics
    await this.updateLoginStats(provider.id);

    // Generate tokens
    const tokenPayload: TokenPayload = {
      provider_id: provider.id,
      email: provider.email,
      role: 'provider',
      specialization: provider.specialization,
      verification_status: provider.verificationStatus,
    };

    const accessToken = this.jwtUtil.generateAccessToken(tokenPayload, remember_me);
    const refreshToken = await this.refreshTokenService.createRefreshToken(provider.id, remember_me);

    this.logSuccessfulLogin(provider.email, clientIp);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: remember_me ? 24 * 60 * 60 : 60 * 60, // 24 hours or 1 hour
      token_type: 'Bearer',
    };
  }

  async patientLogin(patientLoginDto: PatientLoginDto, clientIp: string): Promise<PatientTokenResponse> {
    const { identifier, password } = patientLoginDto;

    // Find patient by email or phone number
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
        ],
      },
    });

    if (!patient) {
      this.logFailedPatientLoginAttempt(identifier, clientIp, 'Patient not found');
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    // Check if account is active
    if (!patient.isActive) {
      this.logFailedPatientLoginAttempt(identifier, clientIp, 'Account inactive');
      throw new ForbiddenException('Account is inactive');
    }

    // Check if email is verified (required for login)
    if (!patient.emailVerified) {
      this.logFailedPatientLoginAttempt(identifier, clientIp, 'Email not verified');
      throw new ForbiddenException('Email not verified');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.verifyPassword(password, patient.passwordHash);

    if (!isPasswordValid) {
      this.logFailedPatientLoginAttempt(identifier, clientIp, 'Invalid password');
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    // Generate patient access token
    const tokenPayload: PatientTokenPayload = {
      sub: patient.id,
      email: patient.email,
      role: 'patient',
    };

    const accessToken = this.jwtUtil.generatePatientAccessToken(tokenPayload);

    this.logSuccessfulPatientLogin(patient.email, clientIp);

    return {
      access_token: accessToken,
      expires_in: 30 * 60, // 30 minutes
      token_type: 'Bearer',
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    const { refresh_token } = refreshTokenDto;

    const validation = await this.refreshTokenService.validateRefreshToken(refresh_token);

    if (!validation.valid || !validation.providerId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get provider information
    const provider = await this.prisma.provider.findUnique({
      where: { id: validation.providerId },
    });

    if (!provider || !provider.isActive) {
      throw new UnauthorizedException('Provider not found or inactive');
    }

    // Generate new tokens
    const tokenPayload: TokenPayload = {
      provider_id: provider.id,
      email: provider.email,
      role: 'provider',
      specialization: provider.specialization,
      verification_status: provider.verificationStatus,
    };

    const newAccessToken = this.jwtUtil.generateAccessToken(tokenPayload, false);
    const newRefreshToken = await this.refreshTokenService.rotateRefreshToken(refresh_token, provider.id, false);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 60 * 60, // 1 hour
      token_type: 'Bearer',
    };
  }

  async logout(refreshTokenDto: RefreshTokenDto): Promise<{ success: boolean; message: string }> {
    const { refresh_token } = refreshTokenDto;

    try {
      const decoded = this.jwtUtil.verifyRefreshToken(refresh_token);
      await this.refreshTokenService.revokeRefreshToken(refresh_token, decoded.provider_id);
    } catch (error) {
      // Even if token is invalid, return success to prevent token enumeration
      this.logger.warn('Invalid refresh token during logout:', error.message);
    }

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  async logoutAll(providerId: string): Promise<{ success: boolean; message: string }> {
    await this.refreshTokenService.revokeAllRefreshTokens(providerId);

    return {
      success: true,
      message: 'All sessions logged out successfully',
    };
  }

  private async handleFailedLogin(providerId: string, clientIp: string): Promise<void> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) return;

    const failedAttempts = provider.failedLoginAttempts + 1;
    const updateData: any = { failedLoginAttempts: failedAttempts };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      updateData.lockedUntil = lockUntil;
    }

    await this.prisma.provider.update({
      where: { id: providerId },
      data: updateData,
    });

    this.logger.warn(`Failed login attempt for provider ${provider.email} from IP ${clientIp}. Attempt ${failedAttempts}/5`);
  }

  private async resetFailedLoginAttempts(providerId: string): Promise<void> {
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  private async updateLoginStats(providerId: string): Promise<void> {
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        lastLogin: new Date(),
        loginCount: {
          increment: 1,
        },
      },
    });
  }

  private logFailedLoginAttempt(identifier: string, clientIp: string, reason: string): void {
    this.logger.warn(`Failed login attempt: ${reason} for identifier ${identifier} from IP ${clientIp}`);
  }

  private logSuccessfulLogin(email: string, clientIp: string): void {
    this.logger.log(`Successful login for provider ${email} from IP ${clientIp}`);
  }

  private logFailedPatientLoginAttempt(identifier: string, clientIp: string, reason: string): void {
    this.logger.warn(`Failed patient login attempt: ${reason} for identifier ${identifier} from IP ${clientIp}`);
  }

  private logSuccessfulPatientLogin(email: string, clientIp: string): void {
    this.logger.log(`Successful patient login for ${email} from IP ${clientIp}`);
  }

  async getProviderInfo(identifier: string) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
        ],
      },
    });

    if (!provider) {
      throw new UnauthorizedException('Provider not found');
    }

    return {
      id: provider.id,
      first_name: provider.firstName,
      last_name: provider.lastName,
      email: provider.email,
      specialization: provider.specialization,
      verification_status: provider.verificationStatus,
      is_active: provider.isActive,
    };
  }

  async getPatientInfo(identifier: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier },
        ],
      },
    });

    if (!patient) {
      throw new UnauthorizedException('Patient not found');
    }

    return {
      id: patient.id,
      first_name: patient.firstName,
      last_name: patient.lastName,
      email: patient.email,
      phone_number: patient.phoneNumber,
      email_verified: patient.emailVerified,
      phone_verified: patient.phoneVerified,
    };
  }
} 