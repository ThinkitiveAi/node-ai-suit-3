import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrencePattern, AppointmentType } from '../../../generated/prisma';

export class LocationDto {
  @ApiProperty({
    description: 'Location type (clinic, virtual, home, etc.)',
    example: 'clinic',
  })
  @IsString()
  @IsNotEmpty()
  type: string; // clinic, virtual, home, etc.

  @ApiProperty({
    description: 'Full address',
    example: '123 Medical Center Dr, New York, NY 10001',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Room number',
    example: '203',
  })
  @IsOptional()
  @IsString()
  room_number?: string;

  @ApiPropertyOptional({
    description: 'Building name',
    example: 'Medical Plaza',
  })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({
    description: 'Floor number',
    example: '2nd Floor',
  })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({
    description: 'Special instructions for patients',
    example: 'Enter through the main entrance and take elevator to 2nd floor',
  })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class PricingDto {
  @ApiProperty({
    description: 'Base consultation fee',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  base_fee: number;

  @ApiPropertyOptional({
    description: 'Whether insurance is accepted',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  insurance_accepted?: boolean;

  @ApiProperty({
    description: 'Currency code',
    example: 'INR',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({
    description: 'Consultation fee',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultation_fee?: number;

  @ApiPropertyOptional({
    description: 'Follow-up appointment fee',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  follow_up_fee?: number;
}

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Date for availability (YYYY-MM-DD)',
    example: '2024-08-01',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Start time (HH:mm format)',
    example: '09:00',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  start_time: string;

  @ApiProperty({
    description: 'End time (HH:mm format)',
    example: '17:00',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  end_time: string;

  @ApiProperty({
    description: 'Timezone for the availability',
    example: 'Asia/Kolkata',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  timezone: string;

  @ApiPropertyOptional({
    description: 'Duration of each slot in minutes',
    example: 30,
    minimum: 15,
    maximum: 480,
    default: 30,
  })
  @IsNumber()
  @Min(15)
  @Max(480) // 8 hours max
  slot_duration: number = 30;

  @ApiPropertyOptional({
    description: 'Break duration between slots in minutes',
    example: 15,
    minimum: 0,
    maximum: 60,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(60)
  break_duration: number = 0;

  @ApiPropertyOptional({
    description: 'Whether this is a recurring availability',
    example: false,
    default: false,
  })
  @IsBoolean()
  is_recurring: boolean = false;

  @ApiPropertyOptional({
    description: 'Recurrence pattern for recurring availability',
    enum: RecurrencePattern,
    example: 'weekly',
  })
  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrence_pattern?: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'End date for recurring availability (YYYY-MM-DD)',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString()
  recurrence_end_date?: string;

  @ApiPropertyOptional({
    description: 'Type of appointment',
    enum: AppointmentType,
    example: 'consultation',
    default: 'consultation',
  })
  @IsEnum(AppointmentType)
  appointment_type: AppointmentType = 'consultation';

  @ApiProperty({
    description: 'Location information for the appointment',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsObject()
  location: LocationDto;

  @ApiPropertyOptional({
    description: 'Pricing information',
    type: PricingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  @IsObject()
  pricing?: PricingDto;

  @ApiPropertyOptional({
    description: 'Special requirements for the appointment',
    example: ['bring_report', 'fasting_required'],
    type: [String],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  special_requirements?: string[] = [];

  @ApiPropertyOptional({
    description: 'Additional notes for the availability',
    example: 'Regular consultation hours',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional({
    description: 'Maximum appointments per slot',
    example: 1,
    minimum: 1,
    maximum: 10,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  max_appointments_per_slot?: number = 1;
} 