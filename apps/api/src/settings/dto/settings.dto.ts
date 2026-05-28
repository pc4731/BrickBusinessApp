import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BrickLossPolicy, Languages } from '@brick/types';

const LOSS_POLICIES: BrickLossPolicy[] = ['SELLER_BEARS', 'BUYER_BEARS', 'SPLIT'];

class OwnTruckCostModelDto {
  @IsIn(['PER_TRIP', 'PER_BRICK', 'NONE'])
  type!: 'PER_TRIP' | 'PER_BRICK' | 'NONE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPaise?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paisePerBrick?: number;
}

class OrgSettingsPatchDto {
  @IsOptional()
  gstEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultGstRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThresholdBricks?: number;

  @IsOptional()
  @IsIn(LOSS_POLICIES)
  brickLossPolicy?: BrickLossPolicy;

  @IsOptional()
  @ValidateNested()
  @Type(() => OwnTruckCostModelDto)
  ownTruckCostModel?: OwnTruckCostModelDto;

  @IsOptional()
  @IsIn(Languages as unknown as string[])
  defaultLanguage?: (typeof Languages)[number];

  @IsOptional()
  @IsString()
  @MaxLength(6)
  orderNumberPrefix?: string;
}

export class UpdateSettingsDto {
  // ── Business / org details ──
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(200) legalName?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() @MaxLength(15) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(15) gstin?: string;
  @IsOptional() @IsString() @MaxLength(10) pan?: string;
  @IsOptional() @IsString() logoUrl?: string;

  // ── Behaviour settings (merged into Organization.settings JSON) ──
  @IsOptional()
  @ValidateNested()
  @Type(() => OrgSettingsPatchDto)
  settings?: OrgSettingsPatchDto;
}
