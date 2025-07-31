import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsStrongPassword,
  IsEnum,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../../../generated/prisma';

export class AddressDto {
  @ApiProperty({
    description: 'Street address',
    example: '123 Medical Center Dr',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  street: string;

  @ApiProperty({
    description: 'City name',
    example: 'New York',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'NY',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  state: string;

  @ApiProperty({
    description: 'ZIP or postal code',
    example: '10001',
    pattern: '^[0-9]{5}(-[0-9]{4})?$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{5}(-[0-9]{4})?$/, {
    message: 'Invalid ZIP code format. Use 5 digits or 5+4 format.',
  })
  zip: string;
}

export class CreateProviderDto {
  @ApiProperty({
    description: 'Provider first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  first_name: string;

  @ApiProperty({
    description: 'Provider last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  last_name: string;

  @ApiProperty({
    description: 'Provider email address',
    example: 'john.doe@clinic.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Provider phone number (international format)',
    example: '+1234567890',
    pattern: '^\\+?[0-9]{10,15}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Invalid phone number format. Use international format.',
  })
  phone_number: string;

  @ApiProperty({
    description: 'Provider password (must be strong)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character.',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Password confirmation (must match password)',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;

  @ApiProperty({
    description: 'Medical specialization',
    example: 'Cardiology',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  specialization: string;

  @ApiProperty({
    description: 'Medical license number (must be unique)',
    example: 'MD123456789',
    minLength: 5,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  license_number: string;

  @ApiProperty({
    description: 'Years of medical experience',
    example: 10,
    minimum: 0,
    maximum: 50,
  })
  @IsNumber()
  @Min(0, { message: 'Years of experience cannot be negative' })
  @Max(50, { message: 'Years of experience cannot exceed 50' })
  years_of_experience: number;

  @ApiProperty({
    description: 'Clinic address information',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  clinic_address: AddressDto;
} 