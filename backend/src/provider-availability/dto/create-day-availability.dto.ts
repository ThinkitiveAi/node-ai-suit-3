import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../../generated/prisma';

export class DayAvailabilityDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: DayOfWeek,
    example: 'monday',
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({
    description: 'Start time in 12-hour format (e.g., "09:00 AM")',
    example: '09:00 AM',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  startTime: string;

  @ApiProperty({
    description: 'End time in 12-hour format (e.g., "06:00 PM")',
    example: '06:00 PM',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  endTime: string;
}

export class BlockDayDto {
  @ApiProperty({
    description: 'Date to block (YYYY-MM-DD format)',
    example: '2024-08-15',
  })
  @IsString()
  @IsNotEmpty()
  blockDate: string;

  @ApiPropertyOptional({
    description: 'Start time for the blocked period (HH:mm format, e.g., "09:00")',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time for the blocked period (HH:mm format, e.g., "17:00")',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Reason for blocking this time slot',
    example: 'Holiday',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  reason?: string;
}

export class CreateDayAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Provider ID (if not provided, will use authenticated user ID)',
    example: 'provider-uuid',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  providerId?: string;

  @ApiProperty({
    description: 'Time zone for the provider (e.g., "America/New_York", "UTC")',
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  timezone: string;

  @ApiProperty({
    description: 'Array of day-wise availability settings',
    type: [DayAvailabilityDto],
    example: [
      {
        dayOfWeek: 'monday',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
      },
      {
        dayOfWeek: 'tuesday',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  dayAvailabilities: DayAvailabilityDto[];

  @ApiPropertyOptional({
    description: 'Array of blocked days/slots',
    type: [BlockDayDto],
    example: [
      {
        blockDate: '2024-12-25',
        startTime: '09:00',
        endTime: '17:00',
        reason: 'Christmas Holiday',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDayDto)
  blockDays?: BlockDayDto[];
} 