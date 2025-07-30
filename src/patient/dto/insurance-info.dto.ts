import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class InsuranceInfoDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  provider: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Transform(({ value }) => value?.trim())
  policy_number: string;
} 