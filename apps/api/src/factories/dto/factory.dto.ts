import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
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

export class CreateFactoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

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
  @IsString()
  @MaxLength(15)
  gstin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditLimitPaise?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateFactoryDto extends PartialType(CreateFactoryDto) {}

export class CreateFactoryPriceDto {
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
