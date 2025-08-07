import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../../generated/prisma';

export class UpdateDayAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Provider ID (if not provided, will use authenticated user ID)',
    example: 'provider-uuid',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Time zone for the provider (e.g., "America/New_York", "UTC")',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Start time in 12-hour format (e.g., "09:00 AM")',
    example: '09:00 AM',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time in 12-hour format (e.g., "06:00 PM")',
    example: '06:00 PM',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Whether this day availability is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 