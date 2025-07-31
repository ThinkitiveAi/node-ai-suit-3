import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PatientLoginDto } from './patient-login.dto';

describe('PatientLoginDto', () => {
  describe('validation', () => {
    it('should pass validation with valid email', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: 'jane.smith@email.com',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid phone number', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '+1234567890',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with phone number without country code', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '1234567890',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid email', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: 'invalid-email',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid phone number', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '123',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with empty identifier', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '',
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with empty password', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: 'jane.smith@email.com',
        password: '',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with missing identifier', async () => {
      const dto = plainToClass(PatientLoginDto, {
        password: 'SecurePassword123!',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with missing password', async () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: 'jane.smith@email.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('transformation', () => {
    it('should transform identifier to lowercase and trim', () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '  JANE.SMITH@EMAIL.COM  ',
        password: 'SecurePassword123!',
      });

      expect(dto.identifier).toBe('jane.smith@email.com');
    });

    it('should transform phone number to lowercase and trim', () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '  +1234567890  ',
        password: 'SecurePassword123!',
      });

      expect(dto.identifier).toBe('+1234567890');
    });
  });

  describe('emailValidation', () => {
    it('should return email for email identifier', () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: 'jane.smith@email.com',
        password: 'SecurePassword123!',
      });

      expect(dto.emailValidation).toBe('jane.smith@email.com');
    });

    it('should return undefined for phone identifier', () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '+1234567890',
        password: 'SecurePassword123!',
      });

      expect(dto.emailValidation).toBeUndefined();
    });
  });

  describe('phoneValidation', () => {
    it('should return phone for phone identifier', () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: '+1234567890',
        password: 'SecurePassword123!',
      });

      expect(dto.phoneValidation).toBe('+1234567890');
    });

    it('should return undefined for email identifier', () => {
      const dto = plainToClass(PatientLoginDto, {
        identifier: 'jane.smith@email.com',
        password: 'SecurePassword123!',
      });

      expect(dto.phoneValidation).toBeUndefined();
    });
  });
}); 