import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BrickClasses } from '@brick/types';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(15)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phoneAlt?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pan?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditLimitPaise?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CreateCustomerAddressDto {
  @IsString()
  @MaxLength(60)
  label!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  fullAddress!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  isDefault?: boolean;
}

export class CreateCustomerPriceDto {
  @IsIn(BrickClasses as unknown as string[])
  brickClass!: (typeof BrickClasses)[number];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePerBrickPaise!: number;

  @IsISO8601()
  effectiveFrom!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
