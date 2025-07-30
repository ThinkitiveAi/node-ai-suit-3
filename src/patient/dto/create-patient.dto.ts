import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsStrongPassword,
  IsDateString,
  IsEnum,
  ValidateNested,
  IsOptional,
  IsArray,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../../generated/prisma';
import { AddressDto } from './address.dto';
import { EmergencyContactDto } from './emergency-contact.dto';
import { InsuranceInfoDto } from './insurance-info.dto';

export class CreatePatientDto {
  @ApiProperty({
    description: 'Patient first name',
    example: 'Jane',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  first_name: string;

  @ApiProperty({
    description: 'Patient last name',
    example: 'Smith',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  last_name: string;

  @ApiProperty({
    description: 'Patient email address',
    example: 'jane.smith@email.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Patient phone number (international format)',
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
    description: 'Patient password (must be strong)',
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
    description: 'Patient date of birth (YYYY-MM-DD)',
    example: '1990-05-15',
  })
  @IsDateString()
  date_of_birth: string;

  @ApiProperty({
    description: 'Patient gender',
    enum: Gender,
    example: 'female',
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'Patient address information',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional({
    description: 'Emergency contact information',
    type: EmergencyContactDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergency_contact?: EmergencyContactDto;

  @ApiPropertyOptional({
    description: 'Insurance information',
    type: InsuranceInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InsuranceInfoDto)
  insurance_info?: InsuranceInfoDto;

  @ApiPropertyOptional({
    description: 'Marketing opt-in preference',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean = false;
} 