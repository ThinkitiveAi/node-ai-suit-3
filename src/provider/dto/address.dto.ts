import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  @Transform(({ value }) => value?.trim())
  street: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Transform(({ value }) => value?.trim())
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  state: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'Zip code must be in valid US format (e.g., 12345 or 12345-6789)',
  })
  @Transform(({ value }) => value?.trim())
  zip: string;
} 