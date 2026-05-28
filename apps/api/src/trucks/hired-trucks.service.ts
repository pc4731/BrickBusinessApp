import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import { CreateHiredTruckDto, UpdateHiredTruckDto } from './dto/hired-truck.dto';

@Injectable()
export class HiredTrucksService {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, dto: CreateHiredTruckDto) {
    return this.prisma.hiredTruck.create({ data: { orgId, ...dto } });
  }

  async findAll(orgId: string, query: PaginationQueryDto) {
    const where: Prisma.HiredTruckWhereInput = {
      orgId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { ownerName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.hiredTruck.findMany({ where, orderBy: { number: 'asc' }, skip: query.skip, take: query.limit }),
      this.prisma.hiredTruck.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const truck = await this.prisma.hiredTruck.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!truck) throw new NotFoundException('Hired truck not found');
    return truck;
  }

  async update(orgId: string, id: string, dto: UpdateHiredTruckDto) {
    await this.findOne(orgId, id);
    return this.prisma.hiredTruck.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.hiredTruck.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
