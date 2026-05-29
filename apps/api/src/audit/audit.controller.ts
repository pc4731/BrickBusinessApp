import { Controller, Get, Query } from '@nestjs/common';
import type { AuditAction } from '@brick/db';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Roles('OWNER')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentOrg() orgId: string, @Query() query: AuditQueryDto) {
    return this.audit.list(orgId, {
      page: query.page,
      limit: query.limit,
      skip: query.skip,
      entityType: query.entityType,
      action: query.action as AuditAction | undefined,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }
}
