import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentModes } from '@brick/types';

const RentalStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

export class CreateTruckRentalDto {
  @IsString()
  ownTruckId!: string;

  @IsString()
  @MaxLength(120)
  renterName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  renterPhone?: string;

  // Total agreed rent for the engagement, in paise.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rentAmountPaise!: number;

  @IsISO8601()
  startDate!: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateRentalStatusDto {
  @IsIn(RentalStatuses as unknown as string[])
  status!: (typeof RentalStatuses)[number];
}

export class CreateRentalPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise!: number;

  @IsIn(PaymentModes as unknown as string[])
  paymentMode!: (typeof PaymentModes)[number];

  @IsISO8601()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
