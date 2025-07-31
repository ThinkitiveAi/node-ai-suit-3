import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Provider Registration (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const validRegistrationData = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@clinic.com',
    phone_number: '+1234567890',
    password: 'SecurePassword123!',
    password_confirm: 'SecurePassword123!',
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    prismaService = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.provider.deleteMany({
      where: {
        email: {
          in: [
            'john.doe@clinic.com',
            'jane.smith@clinic.com',
            'test@example.com',
          ],
        },
      },
    });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prismaService.provider.deleteMany({
      where: {
        email: {
          in: [
            'john.doe@clinic.com',
            'jane.smith@clinic.com',
            'test@example.com',
          ],
        },
      },
    });
  });

  describe('POST /api/v1/provider/register', () => {
    it('should register a new provider successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Provider registered successfully. Verification email sent.');
      expect(response.body.data).toHaveProperty('provider_id');
      expect(response.body.data.email).toBe(validRegistrationData.email);
      expect(response.body.data.verification_status).toBe('pending');

      // Verify the provider was actually created in the database
      const createdProvider = await prismaService.provider.findUnique({
        where: { email: validRegistrationData.email },
      });
      expect(createdProvider).toBeDefined();
      expect(createdProvider.firstName).toBe(validRegistrationData.first_name);
      expect(createdProvider.lastName).toBe(validRegistrationData.last_name);
      expect(createdProvider.phoneNumber).toBe(validRegistrationData.phone_number);
      expect(createdProvider.specialization).toBe(validRegistrationData.specialization);
      expect(createdProvider.licenseNumber).toBe(validRegistrationData.license_number);
      expect(createdProvider.yearsOfExperience).toBe(validRegistrationData.years_of_experience);
      expect(createdProvider.verificationStatus).toBe('pending');
      expect(createdProvider.isActive).toBe(true);
    });

    it('should return 409 when email already exists', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same email
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });

    it('should return 409 when phone number already exists', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same phone number but different email
      const duplicatePhoneData = {
        ...validRegistrationData,
        email: 'different@example.com',
        license_number: 'MD987654321',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(duplicatePhoneData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Phone number already registered');
    });

    it('should return 409 when license number already exists', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same license number but different email and phone
      const duplicateLicenseData = {
        ...validRegistrationData,
        email: 'different@example.com',
        phone_number: '+1987654321',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(duplicateLicenseData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('License number already registered');
    });

    it('should return 400 when passwords do not match', async () => {
      const invalidData = {
        ...validRegistrationData,
        password_confirm: 'DifferentPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password confirmation does not match');
    });

    it('should return 422 for invalid email format', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toContain('email');
    });

    it('should return 422 for invalid phone number format', async () => {
      const invalidData = {
        ...validRegistrationData,
        phone_number: '1234567890', // Missing + prefix
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toContain('phone_number');
    });

    it('should return 422 for weak password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: 'weak',
        password_confirm: 'weak',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toContain('password');
    });

    it('should return 422 for invalid license number format', async () => {
      const invalidData = {
        ...validRegistrationData,
        license_number: 'MD-123-456', // Contains hyphens
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toContain('license_number');
    });

    it('should return 422 for invalid zip code format', async () => {
      const invalidData = {
        ...validRegistrationData,
        clinic_address: {
          ...validRegistrationData.clinic_address,
          zip: 'invalid',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toContain('zip');
    });

    it('should transform email to lowercase', async () => {
      const dataWithUpperCaseEmail = {
        ...validRegistrationData,
        email: 'TEST@EMAIL.COM',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(dataWithUpperCaseEmail)
        .expect(201);

      expect(response.body.data.email).toBe('test@email.com');

      // Verify in database
      const createdProvider = await prismaService.provider.findUnique({
        where: { email: 'test@email.com' },
      });
      expect(createdProvider).toBeDefined();
    });

    it('should transform license number to uppercase', async () => {
      const dataWithLowerCaseLicense = {
        ...validRegistrationData,
        license_number: 'md123456789',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/register')
        .send(dataWithLowerCaseLicense)
        .expect(201);

      // Verify in database
      const createdProvider = await prismaService.provider.findUnique({
        where: { email: validRegistrationData.email },
      });
      expect(createdProvider.licenseNumber).toBe('MD123456789');
    });
  });
}); 