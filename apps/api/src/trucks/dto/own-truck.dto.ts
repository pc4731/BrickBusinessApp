import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateOwnTruckDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacityBricks?: number;

  @IsOptional()
  @IsISO8601()
  insuranceExpiry?: string;

  @IsOptional()
  @IsISO8601()
  permitExpiry?: string;

  @IsOptional()
  @IsISO8601()
  fitnessExpiry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateOwnTruckDto extends PartialType(CreateOwnTruckDto) {}
