import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PatientJwtStrategy } from './patient-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { Gender } from '../../generated/prisma';

describe('PatientJwtStrategy', () => {
  let strategy: PatientJwtStrategy;
  let prismaService: PrismaService;

  const mockPatient = {
    id: 'patient-id-1',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientJwtStrategy,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    strategy = module.get<PatientJwtStrategy>(PatientJwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return patient data when patient exists and is active', async () => {
      const payload = {
        sub: 'patient-id-1',
        email: 'jane.smith@email.com',
        role: 'patient',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800,
      };

      jest.spyOn(prismaService.patient, 'findUnique').mockResolvedValue(mockPatient);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: mockPatient.id,
        email: mockPatient.email,
        firstName: mockPatient.firstName,
        lastName: mockPatient.lastName,
        phoneNumber: mockPatient.phoneNumber,
        emailVerified: mockPatient.emailVerified,
        phoneVerified: mockPatient.phoneVerified,
        role: 'patient',
      });
    });

    it('should throw UnauthorizedException when patient not found', async () => {
      const payload = {
        sub: 'non-existent-patient',
        email: 'jane.smith@email.com',
        role: 'patient',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800,
      };

      jest.spyOn(prismaService.patient, 'findUnique').mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Patient not found or inactive'),
      );
    });

    it('should throw UnauthorizedException when patient is inactive', async () => {
      const payload = {
        sub: 'patient-id-1',
        email: 'jane.smith@email.com',
        role: 'patient',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800,
      };

      const inactivePatient = { ...mockPatient, isActive: false };

      jest.spyOn(prismaService.patient, 'findUnique').mockResolvedValue(inactivePatient);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Patient not found or inactive'),
      );
    });

    it('should throw UnauthorizedException when email is not verified', async () => {
      const payload = {
        sub: 'patient-id-1',
        email: 'jane.smith@email.com',
        role: 'patient',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1800,
      };

      const unverifiedPatient = { ...mockPatient, emailVerified: false };

      jest.spyOn(prismaService.patient, 'findUnique').mockResolvedValue(unverifiedPatient);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Email not verified. Please verify your email first.'),
      );
    });
  });
}); 