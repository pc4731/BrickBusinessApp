import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import { CreateFactoryDto, CreateFactoryPriceDto, UpdateFactoryDto } from './dto/factory.dto';

@Injectable()
export class FactoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, dto: CreateFactoryDto) {
    return this.prisma.factory.create({ data: { orgId, ...dto } });
  }

  async findAll(orgId: string, query: PaginationQueryDto) {
    const where: Prisma.FactoryWhereInput = {
      orgId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { ownerName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.factory.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.factory.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const factory = await this.prisma.factory.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!factory) throw new NotFoundException('Factory not found');
    const currentPrices = await this.currentPrices(orgId, id);
    return { ...factory, currentPrices };
  }

  async update(orgId: string, id: string, dto: UpdateFactoryDto) {
    await this.ensureExists(orgId, id);
    return this.prisma.factory.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    await this.ensureExists(orgId, id);
    return this.prisma.factory.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Prices (append-only history) ──
  async addPrice(orgId: string, factoryId: string, dto: CreateFactoryPriceDto) {
    await this.ensureExists(orgId, factoryId);
    return this.prisma.factoryPrice.create({
      data: {
        orgId,
        factoryId,
        brickClass: dto.brickClass,
        pricePerBrickPaise: dto.pricePerBrickPaise,
        effectiveFrom: new Date(dto.effectiveFrom),
        note: dto.note,
      },
    });
  }

  async listPrices(orgId: string, factoryId: string) {
    await this.ensureExists(orgId, factoryId);
    return this.prisma.factoryPrice.findMany({
      where: { factoryId },
      orderBy: [{ brickClass: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  async currentPrices(orgId: string, factoryId: string, asOf: Date = new Date()) {
    const rows = await this.prisma.factoryPrice.findMany({
      where: { factoryId, effectiveFrom: { lte: asOf } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const byClass = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byClass.has(row.brickClass)) byClass.set(row.brickClass, row);
    }
    return Array.from(byClass.values());
  }

  private async ensureExists(orgId: string, id: string) {
    const exists = await this.prisma.factory.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Factory not found');
  }
}
