import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT'] as const;

export class AuditQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 30;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsIn(ACTIONS as unknown as string[]) action?: (typeof ACTIONS)[number];
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsISO8601() dateFrom?: string;
  @IsOptional() @IsISO8601() dateTo?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
