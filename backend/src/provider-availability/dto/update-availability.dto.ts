import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AvailabilityStatus, AppointmentType } from '../../../generated/prisma';
import { LocationDto, PricingDto } from './create-availability.dto';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  start_time?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  end_time?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  slot_duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  break_duration?: number;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  status?: AvailabilityStatus;

  @IsOptional()
  @IsEnum(AppointmentType)
  appointment_type?: AppointmentType;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsObject()
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  @IsObject()
  pricing?: PricingDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  special_requirements?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  max_appointments_per_slot?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  current_appointments?: number;
} 