import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHiredTruckDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  ownerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  driverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  driverPhone?: string;
}

export class UpdateHiredTruckDto extends PartialType(CreateHiredTruckDto) {}
