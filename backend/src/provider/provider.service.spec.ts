import { Test, TestingModule } from '@nestjs/testing';
import { ProviderService } from './provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('ProviderService', () => {
  let service: ProviderService;
  let prismaService: PrismaService;
  let mailService: MailService;

  const mockPrismaService = {
    provider: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn(),
  };

  const validCreateProviderDto: CreateProviderDto = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@clinic.com',
    phone_number: '+1234567890',
    password: 'SecurePassword123!',
    confirm_password: 'SecurePassword123!',
    specialization: 'Cardiology',
    license_number: 'MD123456789',
    years_of_experience: 10,
    clinic_address: {
      street: '123 Medical Center Dr',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<ProviderService>(ProviderService);
    prismaService = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerProvider', () => {
    it('should register a new provider successfully', async () => {
      // Mock no existing records
      mockPrismaService.provider.findUnique.mockResolvedValue(null);
      
      // Mock successful creation
      const createdProvider = {
        id: 'test-uuid',
        email: validCreateProviderDto.email,
        verificationStatus: 'pending',
      };
      mockPrismaService.provider.create.mockResolvedValue(createdProvider);
      
      // Mock successful email sending
      mockMailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await service.registerProvider(validCreateProviderDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Provider registered successfully. Verification email sent.');
      expect(result.data.provider_id).toBe('test-uuid');
      expect(result.data.email).toBe(validCreateProviderDto.email);
      expect(result.data.verification_status).toBe('pending');
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const invalidDto = {
        ...validCreateProviderDto,
        confirm_password: 'DifferentPassword123!',
      };

      await expect(service.registerProvider(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerProvider(invalidDto)).rejects.toThrow(
        'Password confirmation does not match',
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.registerProvider(validCreateProviderDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerProvider(validCreateProviderDto)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should throw ConflictException when phone number already exists', async () => {
      // Mock findUnique to return different results based on the where clause
      mockPrismaService.provider.findUnique.mockImplementation((args) => {
        if (args.where.email) {
          return Promise.resolve(null); // Email not found
        }
        if (args.where.phoneNumber) {
          return Promise.resolve({ id: 'existing-id' }); // Phone found
        }
        return Promise.resolve(null);
      });

      await expect(service.registerProvider(validCreateProviderDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerProvider(validCreateProviderDto)).rejects.toThrow(
        'Phone number already registered',
      );
    });

    it('should throw ConflictException when license number already exists', async () => {
      // Mock findUnique to return different results based on the where clause
      mockPrismaService.provider.findUnique.mockImplementation((args) => {
        if (args.where.email) {
          return Promise.resolve(null); // Email not found
        }
        if (args.where.phoneNumber) {
          return Promise.resolve(null); // Phone not found
        }
        if (args.where.licenseNumber) {
          return Promise.resolve({ id: 'existing-id' }); // License found
        }
        return Promise.resolve(null);
      });

      await expect(service.registerProvider(validCreateProviderDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerProvider(validCreateProviderDto)).rejects.toThrow(
        'License number already registered',
      );
    });

    it('should handle email sending failure gracefully', async () => {
      mockPrismaService.provider.findUnique.mockResolvedValue(null);
      
      const createdProvider = {
        id: 'test-uuid',
        email: validCreateProviderDto.email,
        verificationStatus: 'pending',
      };
      mockPrismaService.provider.create.mockResolvedValue(createdProvider);
      
      // Mock email sending failure
      mockMailService.sendVerificationEmail.mockResolvedValue(false);

      const result = await service.registerProvider(validCreateProviderDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Provider registered successfully. Verification email sent.');
      // Service should still return success even if email fails
    });
  });

  describe('findByEmail', () => {
    it('should find provider by email', async () => {
      const mockProvider = { id: 'test-id', email: 'test@example.com' };
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockProvider);
      expect(mockPrismaService.provider.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findById', () => {
    it('should find provider by id', async () => {
      const mockProvider = { id: 'test-id', email: 'test@example.com' };
      mockPrismaService.provider.findUnique.mockResolvedValue(mockProvider);

      const result = await service.findById('test-id');

      expect(result).toEqual(mockProvider);
      expect(mockPrismaService.provider.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });
  });
}); 