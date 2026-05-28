import { PartialType } from '@nestjs/mapped-types';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  licenseNumber?: string;

  @IsOptional()
  @IsISO8601()
  licenseExpiry?: string;
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
