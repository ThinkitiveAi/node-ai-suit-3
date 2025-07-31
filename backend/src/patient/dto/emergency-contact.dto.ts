import { IsString, IsNotEmpty, IsOptional, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +1234567890)',
  })
  @Transform(({ value }) => value?.trim())
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Transform(({ value }) => value?.trim())
  relationship: string;
} 