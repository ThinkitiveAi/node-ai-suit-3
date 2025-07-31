import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordUtil } from '../src/utils/password.util';

describe('Provider Authentication (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  const testProvider = {
    id: 'test-auth-provider-id',
    firstName: 'Auth',
    lastName: 'Test',
    email: 'auth.test@example.com',
    phoneNumber: '+1987654321',
    passwordHash: '',
    specialization: 'Cardiology',
    licenseNumber: 'AUTH123456789',
    yearsOfExperience: 5,
    clinicStreet: '123 Auth St',
    clinicCity: 'Auth City',
    clinicState: 'TX',
    clinicZip: '12345',
    verificationStatus: 'verified' as const,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    loginCount: 0,
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

    // Create test provider with hashed password
    const passwordHash = await PasswordUtil.hashPassword('SecurePassword123!');
    await prismaService.provider.create({
      data: {
        ...testProvider,
        passwordHash,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.refreshToken.deleteMany({
      where: {
        providerId: testProvider.id,
      },
    });
    await prismaService.provider.deleteMany({
      where: {
        email: testProvider.email,
      },
    });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up refresh tokens before each test
    await prismaService.refreshToken.deleteMany({
      where: {
        providerId: testProvider.id,
      },
    });
  });

  describe('POST /api/v1/provider/login', () => {
    it('should login successfully with email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'SecurePassword123!',
          remember_me: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');
      expect(response.body.data).toHaveProperty('expires_in');
      expect(response.body.data).toHaveProperty('token_type');
      expect(response.body.data).toHaveProperty('provider');

      // Store tokens for other tests
      accessToken = response.body.data.access_token;
      refreshToken = response.body.data.refresh_token;

      // Verify provider data
      expect(response.body.data.provider.id).toBe(testProvider.id);
      expect(response.body.data.provider.email).toBe(testProvider.email);
      expect(response.body.data.provider.verification_status).toBe('verified');
      expect(response.body.data.provider.is_active).toBe(true);
    });

    it('should login successfully with phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.phoneNumber,
          password: 'SecurePassword123!',
          remember_me: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data.provider.email).toBe(testProvider.email);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'WrongPassword123!',
          remember_me: false,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent provider', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'SecurePassword123!',
          remember_me: false,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 422 for invalid request format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: '',
          password: '',
        })
        .expect(422);

      expect(response.body.message).toContain('identifier');
      expect(response.body.message).toContain('password');
    });

    it('should handle remember_me parameter', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'SecurePassword123!',
          remember_me: true,
        })
        .expect(200);

      expect(response.body.data.expires_in).toBe(24 * 60 * 60); // 24 hours
    });
  });

  describe('POST /api/v1/provider/refresh', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'SecurePassword123!',
          remember_me: false,
        });

      refreshToken = loginResponse.body.data.refresh_token;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');
      expect(response.body.data.expires_in).toBe(3600); // 1 hour
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/refresh')
        .send({
          refresh_token: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 422 for missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/refresh')
        .send({})
        .expect(422);

      expect(response.body.message).toContain('refresh_token');
    });
  });

  describe('POST /api/v1/provider/logout', () => {
    beforeEach(async () => {
      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'SecurePassword123!',
          remember_me: false,
        });

      refreshToken = loginResponse.body.data.refresh_token;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/logout')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should return success even for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/logout')
        .send({
          refresh_token: 'invalid-token',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('POST /api/v1/provider/logout-all', () => {
    beforeEach(async () => {
      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'SecurePassword123!',
          remember_me: false,
        });

      accessToken = loginResponse.body.data.access_token;
    });

    it('should logout all sessions successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All sessions logged out successfully');
    });

    it('should return 401 without valid access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/logout-all')
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Make 6 failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/provider/login')
          .send({
            identifier: testProvider.email,
            password: 'WrongPassword123!',
            remember_me: false,
          });
      }

      // The 6th attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/provider/login')
        .send({
          identifier: testProvider.email,
          password: 'SecurePassword123!',
          remember_me: false,
        })
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Too many login attempts');
    });
  });
}); 