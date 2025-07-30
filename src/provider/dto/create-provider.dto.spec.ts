import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateProviderDto } from './create-provider.dto';

describe('CreateProviderDto', () => {
  const validAddress = {
    street: '123 Medical Center Dr',
    city: 'New York',
    state: 'NY',
    zip: '10001',
  };

  const validDto = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@clinic.com',
    phone_number: '+1234567890',
    password: 'SecurePassword123!',
    password_confirm: 'SecurePassword123!',
    specialization: 'Cardiology',
    license_number: 'MD123456789',
    years_of_experience: 10,
    clinic_address: validAddress,
  };

  it('should validate a correct DTO', async () => {
    const dto = plainToClass(CreateProviderDto, validDto);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail with invalid email', async () => {
    const invalidDto = { ...validDto, email: 'invalid-email' };
    const dto = plainToClass(CreateProviderDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isEmail).toBeDefined();
  });

  it('should fail with invalid phone number', async () => {
    const invalidDto = { ...validDto, phone_number: '1234567890' };
    const dto = plainToClass(CreateProviderDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.matches).toBeDefined();
  });

  it('should fail with weak password', async () => {
    const invalidDto = { ...validDto, password: 'weak', password_confirm: 'weak' };
    const dto = plainToClass(CreateProviderDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.minLength).toBeDefined();
  });

  it('should fail with invalid license number', async () => {
    const invalidDto = { ...validDto, license_number: 'MD-123-456' };
    const dto = plainToClass(CreateProviderDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.matches).toBeDefined();
  });

  it('should fail with invalid years of experience', async () => {
    const invalidDto = { ...validDto, years_of_experience: -1 };
    const dto = plainToClass(CreateProviderDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.min).toBeDefined();
  });

  it('should transform email to lowercase', () => {
    const dto = plainToClass(CreateProviderDto, { ...validDto, email: 'TEST@EMAIL.COM' });
    expect(dto.email).toBe('test@email.com');
  });

  it('should transform license number to uppercase', () => {
    const dto = plainToClass(CreateProviderDto, { ...validDto, license_number: 'md123456789' });
    expect(dto.license_number).toBe('MD123456789');
  });
}); 