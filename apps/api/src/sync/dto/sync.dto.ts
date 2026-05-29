import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export const SYNC_ENTITY_TYPES = ['order', 'customer_payment'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export class SyncOperationDto {
  @IsString()
  clientUuid!: string;

  @IsIn(SYNC_ENTITY_TYPES as unknown as string[])
  entityType!: SyncEntityType;

  @IsIn(['create'])
  operation!: 'create';

  @IsObject()
  payload!: Record<string, unknown>;

  @IsISO8601()
  clientTimestamp!: string;

  @IsString()
  deviceId!: string;
}

export class SyncRequestDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}

export interface SyncResult {
  clientUuid: string;
  status: 'synced' | 'failed';
  entityId?: string;
  error?: string;
}
