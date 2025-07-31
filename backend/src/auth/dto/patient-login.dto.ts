import { IsString, IsNotEmpty, ValidateIf, IsEmail, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PatientLoginDto {
  @ApiProperty({
    description: 'Email or phone number for login',
    example: 'jane.smith@email.com',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  identifier: string; // email or phone number

  @ApiProperty({
    description: 'Patient password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  // Custom validation for identifier
  @ValidateIf((o) => o.identifier && o.identifier.includes('@'))
  @IsEmail({}, { message: 'Invalid email format' })
  get emailValidation() {
    return this.identifier?.includes('@') ? this.identifier : undefined;
  }

  @ValidateIf((o) => o.identifier && !o.identifier.includes('@'))
  @Matches(/^\+?[0-9]{10,15}$/, { // Updated regex for phone number
    message: 'Invalid phone number format',
  })
  get phoneValidation() {
    return this.identifier && !this.identifier.includes('@') ? this.identifier : undefined;
  }
} 