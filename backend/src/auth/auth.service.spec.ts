import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUtil } from '../utils/jwt.util';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordUtil } from '../utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PatientLoginDto } from './dto/patient-login.dto';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { LockedException } from '../common/exceptions/locked.exception';
import { Gender } from '../../generated/prisma';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtUtil: JwtUtil;
  let refreshTokenService: RefreshTokenService;

  const mockPrismaService = {
    provider: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
  };

  const mockJwtUtil = {
    generateAccessToken: jest.fn(),
    generatePatientAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllRefreshTokens: jest.fn(),
  };

  const mockProvider = {
    id: 'test-provider-id',
    email: 'test@example.com',
    phoneNumber: '+1234567890',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    specialization: 'Cardiology',
    verificationStatus: 'verified',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    loginCount: 0,
  };

  const mockPatient = {
    id: 'test-patient-id',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@email.com',
    phoneNumber: '+1234567890',
    passwordHash: 'hashed-password',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'female' as Gender,
    clinicStreet: '456 Main Street',
    clinicCity: 'Boston',
    clinicState: 'MA',
    clinicZip: '02101',
    emergencyName: 'John Smith',
    emergencyPhone: '+1234567891',
    emergencyRelation: 'spouse',
    medicalHistory: ['Allergy to penicillin'],
    insuranceProvider: 'Blue Cross',
    insurancePolicy: 'encrypted-policy-number',
    emailVerified: true,
    phoneVerified: false,
    isActive: true,
    marketingOptIn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validLoginDto: LoginDto = {
    identifier: 'test@example.com',
    password: 'SecurePassword123!',
    remember_me: false,
  };

  const validPatientLoginDto = {
    identifier: 'jane.smith@email.com',
    password: 'SecurePassword123!',
  } as PatientLoginDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtUtil,
          useValue: mockJwtUtil,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtUtil = module.get<JwtUtil>(JwtUtil);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock provider lookup
      mockPrismaService.provider.findFirst.mockResolvedValue(mockProvider);
      
      // Mock password verification
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(true);
      
      // Mock token generation
      mockJwtUtil.generateAccessToken.mockReturnValue('access-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue('refresh-token');
      
      // Mock database updates
      mockPrismaService.provider.update.mockResolvedValue(mockProvider);

      const result = await service.login(validLoginDto, '127.0.0.1');

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(result.expires_in).toBe(3600); // 1 hour
      expect(result.token_type).toBe('Bearer');
    });

    it('should throw UnauthorizedException for non-existent provider', async () => {
      mockPrismaService.provider.findFirst.mockResolvedValue(null);

      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw ForbiddenException for inactive account', async () => {
      const inactiveProvider = { ...mockProvider, isActive: false };
      mockPrismaService.provider.findFirst.mockResolvedValue(inactiveProvider);

      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        'Account is inactive',
      );
    });

    it('should throw ForbiddenException for unverified account', async () => {
      const unverifiedProvider = { ...mockProvider, verificationStatus: 'pending' };
      mockPrismaService.provider.findFirst.mockResolvedValue(unverifiedProvider);

      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        'Account not verified. Please verify your email first.',
      );
    });

    it('should throw LockedException for locked account', async () => {
      const lockedProvider = { 
        ...mockProvider, 
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };
      mockPrismaService.provider.findFirst.mockResolvedValue(lockedProvider);

      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        LockedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.provider.findFirst.mockResolvedValue(mockProvider);
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(false);
      mockPrismaService.provider.update.mockResolvedValue(mockProvider);

      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(validLoginDto, '127.0.0.1')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should support login with phone number', async () => {
      const phoneLoginDto = { ...validLoginDto, identifier: '+1234567890' };
      mockPrismaService.provider.findFirst.mockResolvedValue(mockProvider);
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(true);
      mockJwtUtil.generateAccessToken.mockReturnValue('access-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue('refresh-token');
      mockPrismaService.provider.update.mockResolvedValue(mockProvider);

      const result = await service.login(phoneLoginDto, '127.0.0.1');

      expect(result.access_token).toBe('access-token');
      expect(mockPrismaService.provider.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: '+1234567890' },
            { phoneNumber: '+1234567890' },
          ],
        },
      });
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should refresh token successfully', async () => {
      mockRefreshTokenService.validateRefreshToken.mockResolvedValue({
        valid: true,
        providerId: mockProvider.id,
      });
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);
      mockRefreshTokenService.rotateRefreshToken.mockResolvedValue('new-refresh-token');
      mockJwtUtil.generateAccessToken.mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshTokenDto);

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
      expect(result.expires_in).toBe(3600);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockRefreshTokenService.validateRefreshToken.mockResolvedValue({
        valid: false,
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should logout successfully', async () => {
      mockJwtUtil.verifyRefreshToken.mockReturnValue({
        provider_id: mockProvider.id,
      });
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout(refreshTokenDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
    });

    it('should return success even for invalid token', async () => {
      mockJwtUtil.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout(refreshTokenDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions successfully', async () => {
      mockRefreshTokenService.revokeAllRefreshTokens.mockResolvedValue(undefined);

      const result = await service.logoutAll('test-provider-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All sessions logged out successfully');
      expect(mockRefreshTokenService.revokeAllRefreshTokens).toHaveBeenCalledWith('test-provider-id');
    });
  });

  describe('patientLogin', () => {
    it('should login patient successfully with valid credentials', async () => {
      // Mock patient lookup
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);
      
      // Mock password verification
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(true);
      
      // Mock token generation
      mockJwtUtil.generatePatientAccessToken.mockReturnValue('patient-access-token');

      const result = await service.patientLogin(validPatientLoginDto, '127.0.0.1');

      expect(result.access_token).toBe('patient-access-token');
      expect(result.expires_in).toBe(1800); // 30 minutes
      expect(result.token_type).toBe('Bearer');
    });

    it('should throw UnauthorizedException for non-existent patient', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(null);

      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        'Invalid email/phone or password',
      );
    });

    it('should throw ForbiddenException for inactive patient account', async () => {
      const inactivePatient = { ...mockPatient, isActive: false };
      mockPrismaService.patient.findFirst.mockResolvedValue(inactivePatient);

      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        'Account is inactive',
      );
    });

    it('should throw ForbiddenException for unverified email', async () => {
      const unverifiedPatient = { ...mockPatient, emailVerified: false };
      mockPrismaService.patient.findFirst.mockResolvedValue(unverifiedPatient);

      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        'Email not verified',
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(false);

      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.patientLogin(validPatientLoginDto, '127.0.0.1')).rejects.toThrow(
        'Invalid email/phone or password',
      );
    });

    it('should support login with phone number', async () => {
      const phoneLoginDto = { ...validPatientLoginDto, identifier: '+1234567890' } as PatientLoginDto;
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);
      jest.spyOn(PasswordUtil, 'verifyPassword').mockResolvedValue(true);
      mockJwtUtil.generatePatientAccessToken.mockReturnValue('patient-access-token');

      const result = await service.patientLogin(phoneLoginDto, '127.0.0.1');

      expect(result.access_token).toBe('patient-access-token');
      expect(mockPrismaService.patient.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: '+1234567890' },
            { phoneNumber: '+1234567890' },
          ],
        },
      });
    });
  });

  describe('getPatientInfo', () => {
    it('should return patient information', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);

      const result = await service.getPatientInfo('jane.smith@email.com');

      expect(result).toEqual({
        id: mockPatient.id,
        first_name: mockPatient.firstName,
        last_name: mockPatient.lastName,
        email: mockPatient.email,
        phone_number: mockPatient.phoneNumber,
        email_verified: mockPatient.emailVerified,
        phone_verified: mockPatient.phoneVerified,
      });
    });

    it('should throw UnauthorizedException for non-existent patient', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(null);

      await expect(service.getPatientInfo('nonexistent@email.com')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getPatientInfo('nonexistent@email.com')).rejects.toThrow(
        'Patient not found',
      );
    });
  });
}); 