import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BrickClasses, OrderStatuses, OrderTypes, TruckTypes } from '@brick/types';

export class OrderStockItemDto {
  @IsString()
  stockBatchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyTaken!: number;
}

export class CreateOrderDto {
  @IsIn(OrderTypes as unknown as string[])
  orderType!: (typeof OrderTypes)[number];

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  customerAddressId?: string;

  // Required for DIRECT (validated in service); omitted for STOCK.
  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsIn(BrickClasses as unknown as string[])
  brickClass!: (typeof BrickClasses)[number];

  // DIRECT only — STOCK derives qty from stockItems.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qtyOrdered?: number;

  // DIRECT only — STOCK derives COGS from batches.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  purchasePricePerBrickPaise?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sellingPricePerBrickPaise!: number;

  @IsIn(TruckTypes as unknown as string[])
  truckType!: (typeof TruckTypes)[number];

  @IsOptional()
  @IsString()
  ownTruckId?: string;

  @IsOptional()
  @IsString()
  hiredTruckId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  truckChargesPaise?: number;

  @IsOptional()
  @IsBoolean()
  isGst?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gstRate?: number; // basis points, 1200 = 12%

  @IsISO8601()
  orderDate!: string;

  @IsOptional()
  @IsISO8601()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  // STOCK only.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderStockItemDto)
  stockItems?: OrderStockItemDto[];

  // Create directly as CONFIRMED (else DRAFT).
  @IsOptional()
  @IsIn(['DRAFT', 'CONFIRMED'])
  status?: 'DRAFT' | 'CONFIRMED';
}

// Editable fields while an order is still in DRAFT. orderType and stockItems
// are fixed at creation; to change a stock order's batches, delete and recreate.
class EditableOrderFields {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() customerAddressId?: string;
  @IsOptional() @IsString() factoryId?: string;
  @IsOptional() @IsIn(BrickClasses as unknown as string[]) brickClass?: (typeof BrickClasses)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) qtyOrdered?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) purchasePricePerBrickPaise?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sellingPricePerBrickPaise?: number;
  @IsOptional() @IsIn(TruckTypes as unknown as string[]) truckType?: (typeof TruckTypes)[number];
  @IsOptional() @IsString() ownTruckId?: string;
  @IsOptional() @IsString() hiredTruckId?: string;
  @IsOptional() @IsString() driverId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) truckChargesPaise?: number;
  @IsOptional() @IsBoolean() isGst?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) gstRate?: number;
  @IsOptional() @IsISO8601() orderDate?: string;
  @IsOptional() @IsISO8601() deliveryDate?: string;
  @IsOptional() @IsString() @MaxLength(300) deliveryLocation?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateOrderDto extends PartialType(EditableOrderFields) {}

export class TransitionOrderDto {
  @IsIn(OrderStatuses as unknown as string[])
  status!: (typeof OrderStatuses)[number];

  // For DELIVERED (direct orders may deliver partial of qtyOrdered).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  qtyDelivered?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  qtyDiscrepancy?: number;

  @IsOptional()
  @IsISO8601()
  actualDeliveryAt?: string;
}

export class OrderListQueryDto {
  @IsOptional()
  @IsIn(OrderStatuses as unknown as string[])
  status?: (typeof OrderStatuses)[number];

  @IsOptional()
  @IsIn(OrderTypes as unknown as string[])
  orderType?: (typeof OrderTypes)[number];

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

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
