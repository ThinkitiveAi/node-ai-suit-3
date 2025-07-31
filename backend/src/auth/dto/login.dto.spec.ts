import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  const validDto = {
    identifier: 'test@example.com',
    password: 'SecurePassword123!',
    remember_me: false,
  };

  it('should validate a correct DTO', async () => {
    const dto = plainToClass(LoginDto, validDto);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with phone number identifier', async () => {
    const phoneDto = { ...validDto, identifier: '+1234567890' };
    const dto = plainToClass(LoginDto, phoneDto);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with empty identifier', async () => {
    const invalidDto = { ...validDto, identifier: '' };
    const dto = plainToClass(LoginDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isNotEmpty).toBeDefined();
  });

  it('should fail with empty password', async () => {
    const invalidDto = { ...validDto, password: '' };
    const dto = plainToClass(LoginDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isNotEmpty).toBeDefined();
  });

  it('should transform email to lowercase', () => {
    const dto = plainToClass(LoginDto, { ...validDto, identifier: 'TEST@EMAIL.COM' });
    expect(dto.identifier).toBe('test@email.com');
  });

  it('should not transform phone number to lowercase', () => {
    const dto = plainToClass(LoginDto, { ...validDto, identifier: '+1234567890' });
    expect(dto.identifier).toBe('+1234567890');
  });

  it('should transform remember_me string to boolean', () => {
    const dto = plainToClass(LoginDto, { ...validDto, remember_me: 'true' });
    expect(dto.remember_me).toBe(true);
  });

  it('should handle remember_me as boolean', () => {
    const dto = plainToClass(LoginDto, { ...validDto, remember_me: true });
    expect(dto.remember_me).toBe(true);
  });

  it('should default remember_me to false when not provided', () => {
    const dto = plainToClass(LoginDto, { identifier: 'test@example.com', password: 'password' });
    expect(dto.remember_me).toBe(false);
  });

  it('should trim whitespace from identifier', () => {
    const dto = plainToClass(LoginDto, { ...validDto, identifier: '  test@example.com  ' });
    expect(dto.identifier).toBe('test@example.com');
  });
}); 