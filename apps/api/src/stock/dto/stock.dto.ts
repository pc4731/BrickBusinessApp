import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { BrickClasses, TruckTypes } from '@brick/types';

export class CreateStockBatchDto {
  @IsString()
  factoryId!: string;

  @IsIn(BrickClasses as unknown as string[])
  brickClass!: (typeof BrickClasses)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyPurchased!: number; // brick count

  @Type(() => Number)
  @IsInt()
  @Min(0)
  purchasePricePerBrickPaise!: number;

  @IsISO8601()
  purchaseDate!: string;

  @IsOptional()
  @IsIn(TruckTypes as unknown as string[])
  truckType?: (typeof TruckTypes)[number];

  @IsOptional()
  @IsString()
  ownTruckId?: string;

  @IsOptional()
  @IsString()
  hiredTruckId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transportCostPaise?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class StockQueryDto {
  @IsOptional()
  @IsIn(BrickClasses as unknown as string[])
  brickClass?: (typeof BrickClasses)[number];

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
