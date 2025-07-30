import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email or phone number for login',
    example: 'john.doe@clinic.com',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  identifier: string;

  @ApiProperty({
    description: 'Provider password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'Remember me option (extends token expiry)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean = false;
} 