import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlockedSlotDto {
  @ApiPropertyOptional({
    description: 'Provider ID (if not provided, will use authenticated user ID)',
    example: 'provider-uuid',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  providerId?: string;

  @ApiProperty({
    description: 'Date to block (YYYY-MM-DD format)',
    example: '2024-08-15',
  })
  @IsDateString()
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