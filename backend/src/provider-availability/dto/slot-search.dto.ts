import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AppointmentType } from '../../../generated/prisma';

export class SlotSearchDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  specialization?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  location?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  provider_id?: string;

  @IsOptional()
  @IsEnum(AppointmentType)
  appointment_type?: AppointmentType;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  min_duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  max_price?: number;

  @IsOptional()
  @IsBoolean()
  virtual_only?: boolean;

  @IsOptional()
  @IsBoolean()
  in_person_only?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
} 