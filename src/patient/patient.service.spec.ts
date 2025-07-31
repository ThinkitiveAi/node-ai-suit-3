import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from './patient.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailVerificationService } from '../verification/email-verification.service';
import { PhoneVerificationService } from '../verification/phone-verification.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';

// Mock environment variable for encryption tests
const originalEnv = process.env;

describe('PatientService', () => {
  let service: PatientService;
  let prismaService: PrismaService;
  let emailVerificationService: EmailVerificationService;
  let phoneVerificationService: PhoneVerificationService;

  const mockPrismaService = {
    patient: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailVerificationService = {
    sendVerificationEmail: jest.fn(),
    verifyEmailToken: jest.fn(),
    cleanupExpiredTokens: jest.fn(),
  };

  const mockPhoneVerificationService = {
    sendVerificationSMS: jest.fn(),
    verifyOTPWithRateLimit: jest.fn(),
    cleanupExpiredTokens: jest.fn(),
  };

  const validCreatePatientDto: CreatePatientDto = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+1234567890',
    password: 'SecurePass123!',
    confirm_password: 'SecurePass123!',
    date_of_birth: '1990-01-01',
    gender: 'male' as any,
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    },
    emergency_contact: {
      name: 'Jane Doe',
      phone: '+1234567891',
      relationship: 'Spouse',
    },
    insurance_info: {
      provider: 'Blue Cross',
      policy_number: 'POL123456',
    },
    marketing_opt_in: true,
  };

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: PhoneVerificationService,
          useValue: mockPhoneVerificationService,
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailVerificationService = module.get<EmailVerificationService>(EmailVerificationService);
    phoneVerificationService = module.get<PhoneVerificationService>(PhoneVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerPatient', () => {
    it('should register a patient successfully', async () => {
      const mockPatient = {
        id: 'patient-id',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
      };

      mockPrismaService.patient.findUnique.mockResolvedValue(null);
      mockPrismaService.patient.create.mockResolvedValue(mockPatient);
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue(true);
      mockPhoneVerificationService.sendVerificationSMS.mockResolvedValue(true);

      const result = await service.registerPatient(validCreatePatientDto, '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.data.patient_id).toBe('patient-id');
      expect(result.data.email_verification_sent).toBe(true);
      expect(result.data.phone_verification_sent).toBe(true);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const dtoWithMismatchedPasswords = {
        ...validCreatePatientDto,
        confirm_password: 'DifferentPassword123!',
      };

      await expect(service.registerPatient(dtoWithMismatchedPasswords, '127.0.0.1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid date of birth', async () => {
      const dtoWithFutureDate = {
        ...validCreatePatientDto,
        date_of_birth: '2030-01-01',
      };

      await expect(service.registerPatient(dtoWithFutureDate, '127.0.0.1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue({ id: 'existing-patient' });

      await expect(service.registerPatient(validCreatePatientDto, '127.0.0.1'))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when phone already exists', async () => {
      mockPrismaService.patient.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-patient' }); // phone check

      await expect(service.registerPatient(validCreatePatientDto, '127.0.0.1'))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockEmailVerificationService.verifyEmailToken.mockResolvedValue(true);

      const result = await service.verifyEmail('token', 'patient-id');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockEmailVerificationService.verifyEmailToken.mockResolvedValue(false);

      const result = await service.verifyEmail('invalid-token', 'patient-id');

      expect(result).toBe(false);
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone successfully', async () => {
      mockPhoneVerificationService.verifyOTPWithRateLimit.mockResolvedValue(true);

      const result = await service.verifyPhone('123456', 'patient-id', '+1234567890');

      expect(result).toBe(true);
    });

    it('should return false for invalid OTP', async () => {
      mockPhoneVerificationService.verifyOTPWithRateLimit.mockResolvedValue(false);

      const result = await service.verifyPhone('000000', 'patient-id', '+1234567890');

      expect(result).toBe(false);
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend email verification successfully', async () => {
      const mockPatient = { email: 'test@example.com' };
      mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);
      mockEmailVerificationService.sendVerificationEmail.mockResolvedValue(true);

      const result = await service.resendEmailVerification('patient-id');

      expect(result).toBe(true);
    });

    it('should throw BadRequestException when patient not found', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.resendEmailVerification('invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('resendPhoneVerification', () => {
    it('should resend phone verification successfully', async () => {
      const mockPatient = { phoneNumber: '+1234567890' };
      mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);
      mockPhoneVerificationService.sendVerificationSMS.mockResolvedValue(true);

      const result = await service.resendPhoneVerification('patient-id');

      expect(result).toBe(true);
    });

    it('should throw BadRequestException when patient not found', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.resendPhoneVerification('invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getPatientById', () => {
    it('should return patient data with decrypted fields', async () => {
      const mockPatient = {
        id: 'patient-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        clinicStreet: '123 Main St',
        clinicCity: 'New York',
        clinicState: 'NY',
        clinicZip: '10001',
        emergencyName: 'Jane Doe',
        emergencyPhone: '+1234567891',
        emergencyRelation: 'Spouse',
        medicalHistory: [],
        insuranceProvider: 'Blue Cross',
        insurancePolicy: 'encrypted-policy',
        emailVerified: true,
        phoneVerified: false,
        isActive: true,
        marketingOptIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.getPatientById('patient-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('patient-id');
      expect(result.first_name).toBe('John');
    });

    it('should return null when patient not found', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue(null);

      const result = await service.getPatientById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find patient by email', async () => {
      const mockPatient = { id: 'patient-id', email: 'test@example.com' };
      mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockPatient);
    });
  });

  describe('findByPhone', () => {
    it('should find patient by phone', async () => {
      const mockPatient = { id: 'patient-id', phoneNumber: '+1234567890' };
      mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.findByPhone('+1234567890');

      expect(result).toEqual(mockPatient);
    });
  });
}); 