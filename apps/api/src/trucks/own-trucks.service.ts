import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import { CreateOwnTruckDto, UpdateOwnTruckDto } from './dto/own-truck.dto';

// Generic so required fields (e.g. number on create) keep their non-optional type.
function mapDates<
  T extends { insuranceExpiry?: string; permitExpiry?: string; fitnessExpiry?: string },
>(dto: T) {
  return {
    ...dto,
    insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
    permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
    fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : undefined,
  };
}

@Injectable()
export class OwnTrucksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateOwnTruckDto) {
    try {
      return await this.prisma.ownTruck.create({ data: { orgId, ...mapDates(dto) } });
    } catch (e) {
      throw this.translate(e);
    }
  }

  async findAll(orgId: string, query: PaginationQueryDto) {
    const where: Prisma.OwnTruckWhereInput = {
      orgId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ownTruck.findMany({ where, orderBy: { number: 'asc' }, skip: query.skip, take: query.limit }),
      this.prisma.ownTruck.count({ where }),
    ]);
    // Flag trucks that are currently lent out so the UI can hide them from orders.
    const rented = await this.prisma.truckRental.findMany({
      where: { orgId, status: 'ACTIVE', deletedAt: null, ownTruckId: { in: data.map((t) => t.id) } },
      select: { ownTruckId: true },
    });
    const rentedIds = new Set(rented.map((r) => r.ownTruckId));
    const withFlag = data.map((t) => ({ ...t, isRented: rentedIds.has(t.id) }));
    return paginate(withFlag, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const truck = await this.prisma.ownTruck.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!truck) throw new NotFoundException('Truck not found');
    return truck;
  }

  async update(orgId: string, id: string, dto: UpdateOwnTruckDto) {
    await this.findOne(orgId, id);
    try {
      return await this.prisma.ownTruck.update({ where: { id }, data: mapDates(dto) });
    } catch (e) {
      throw this.translate(e);
    }
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.ownTruck.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private translate(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('A truck with this number already exists');
    }
    return e as Error;
  }
}
