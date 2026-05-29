import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';

export interface AuditQuery {
  page: number;
  limit: number;
  skip: number;
  entityType?: string;
  action?: AuditAction;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, q: AuditQuery) {
    const where: Prisma.AuditLogWhereInput = {
      orgId,
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            createdAt: {
              ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
              ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(data, total, q.page, q.limit);
  }
}
