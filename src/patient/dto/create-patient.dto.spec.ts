import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreatePatientDto } from './create-patient.dto';

describe('CreatePatientDto', () => {
  const validDto = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+1234567890',
    password: 'SecurePass123!',
    password_confirm: 'SecurePass123!',
    date_of_birth: '1990-01-01',
    gender: 'male',
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

  it('should validate a correct DTO', async () => {
    const dto = plainToClass(CreatePatientDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid email', async () => {
    const invalidDto = { ...validDto, email: 'invalid-email' };
    const dto = plainToClass(CreatePatientDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isEmail).toBeDefined();
  });

  it('should fail with invalid phone number', async () => {
    const invalidDto = { ...validDto, phone_number: '1234567890' };
    const dto = plainToClass(CreatePatientDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with weak password', async () => {
    const invalidDto = { ...validDto, password: 'weak' };
    const dto = plainToClass(CreatePatientDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid date of birth', async () => {
    const invalidDto = { ...validDto, date_of_birth: 'invalid-date' };
    const dto = plainToClass(CreatePatientDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid gender', async () => {
    const invalidDto = { ...validDto, gender: 'invalid-gender' };
    const dto = plainToClass(CreatePatientDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid zip code', async () => {
    const invalidDto = {
      ...validDto,
      address: { ...validDto.address, zip: 'invalid' },
    };
    const dto = plainToClass(CreatePatientDto, invalidDto);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should transform email to lowercase', () => {
    const dto = plainToClass(CreatePatientDto, {
      ...validDto,
      email: 'TEST@EXAMPLE.COM',
    });
    expect(dto.email).toBe('test@example.com');
  });

  it('should transform state to uppercase', () => {
    const dto = plainToClass(CreatePatientDto, {
      ...validDto,
      address: { ...validDto.address, state: 'ny' },
    });
    expect(dto.address.state).toBe('NY');
  });

  it('should transform marketing_opt_in string to boolean', () => {
    const dto = plainToClass(CreatePatientDto, {
      ...validDto,
      marketing_opt_in: 'true',
    });
    expect(dto.marketing_opt_in).toBe(true);
  });

  it('should handle marketing_opt_in as boolean', () => {
    const dto = plainToClass(CreatePatientDto, {
      ...validDto,
      marketing_opt_in: false,
    });
    expect(dto.marketing_opt_in).toBe(false);
  });

  it('should default marketing_opt_in to false when not provided', () => {
    const { marketing_opt_in, ...dtoWithoutMarketing } = validDto;
    const dto = plainToClass(CreatePatientDto, dtoWithoutMarketing);
    expect(dto.marketing_opt_in).toBe(false);
  });

  it('should trim whitespace from string fields', () => {
    const dto = plainToClass(CreatePatientDto, {
      ...validDto,
      first_name: '  John  ',
      last_name: '  Doe  ',
    });
    expect(dto.first_name).toBe('John');
    expect(dto.last_name).toBe('Doe');
  });

  it('should validate with all gender options', async () => {
    const genders = ['male', 'female', 'other', 'prefer_not_to_say'];
    
    for (const gender of genders) {
      const dto = plainToClass(CreatePatientDto, { ...validDto, gender });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should validate without optional fields', async () => {
    const { emergency_contact, insurance_info, marketing_opt_in, ...requiredFields } = validDto;
    const dto = plainToClass(CreatePatientDto, requiredFields);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
}); 