import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordUtil } from '../src/utils/password.util';
import { Gender } from '../generated/prisma';

describe('Patient Authentication (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testPatient = {
    id: 'test-patient-id',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@email.com',
    phoneNumber: '+1234567890',
    passwordHash: '',
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 422,
      }),
    );

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    // Clear database
    await prismaService.patient.deleteMany();
    await prismaService.provider.deleteMany();
    await prismaService.refreshToken.deleteMany();
    await prismaService.verificationToken.deleteMany();

    // Create test patient with hashed password
    const hashedPassword = await PasswordUtil.hashPassword('SecurePassword123!');
    await prismaService.patient.create({
      data: {
        ...testPatient,
        passwordHash: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    await prismaService.patient.deleteMany();
    await prismaService.provider.deleteMany();
    await prismaService.refreshToken.deleteMany();
    await prismaService.verificationToken.deleteMany();
    await prismaService.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/provider/patient/login', () => {
    it('should login patient successfully with email', async () => {
      const loginData = {
        identifier: 'jane.smith@email.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('expires_in', 1800);
      expect(response.body.data).toHaveProperty('token_type', 'Bearer');
      expect(response.body.data).toHaveProperty('patient');
      expect(response.body.data.patient).toEqual({
        id: testPatient.id,
        first_name: testPatient.firstName,
        last_name: testPatient.lastName,
        email: testPatient.email,
        phone_number: testPatient.phoneNumber,
        email_verified: testPatient.emailVerified,
        phone_verified: testPatient.phoneVerified,
      });
    });

    it('should login patient successfully with phone number', async () => {
      const loginData = {
        identifier: '+1234567890',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('expires_in', 1800);
      expect(response.body.data).toHaveProperty('token_type', 'Bearer');
      expect(response.body.data).toHaveProperty('patient');
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        identifier: 'jane.smith@email.com',
        password: 'WrongPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email/phone or password');
    });

    it('should return 401 for non-existent patient', async () => {
      const loginData = {
        identifier: 'nonexistent@email.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email/phone or password');
    });

    it('should return 403 for inactive patient account', async () => {
      // Update patient to inactive
      await prismaService.patient.update({
        where: { id: testPatient.id },
        data: { isActive: false },
      });

      const loginData = {
        identifier: 'jane.smith@email.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is inactive');
    });

    it('should return 403 for unverified email', async () => {
      // Update patient to unverified email
      await prismaService.patient.update({
        where: { id: testPatient.id },
        data: { emailVerified: false },
      });

      const loginData = {
        identifier: 'jane.smith@email.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email not verified');
    });

    it('should return 422 for invalid request format', async () => {
      const loginData = {
        identifier: 'invalid-email',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(422);

      expect(response.body.statusCode).toBe(422);
    });

    it('should return 422 for missing required fields', async () => {
      const loginData = {
        identifier: 'jane.smith@email.com',
        // missing password
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(422);

      expect(response.body.statusCode).toBe(422);
    });

    it('should return 422 for empty fields', async () => {
      const loginData = {
        identifier: '',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/patient/login')
        .send(loginData)
        .expect(422);

      expect(response.body.statusCode).toBe(422);
    });
  });
}); 