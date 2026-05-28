import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

// Generic so required fields (e.g. name on create) keep their non-optional type.
function mapDates<T extends { licenseExpiry?: string }>(dto: T) {
  return { ...dto, licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined };
}

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({ data: { orgId, ...mapDates(dto) } });
  }

  async findAll(orgId: string, query: PaginationQueryDto) {
    const where: Prisma.DriverWhereInput = {
      orgId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({ where, orderBy: { name: 'asc' }, skip: query.skip, take: query.limit }),
      this.prisma.driver.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(orgId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(orgId, id);
    return this.prisma.driver.update({ where: { id }, data: mapDates(dto) });
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.driver.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
