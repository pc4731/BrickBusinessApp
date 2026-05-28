import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import {
  CreateCustomerAddressDto,
  CreateCustomerDto,
  CreateCustomerPriceDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  create(orgId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { orgId, ...dto } });
  }

  async findAll(orgId: string, query: PaginationQueryDto) {
    const where: Prisma.CustomerWhereInput = {
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
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        addresses: { where: { deletedAt: null }, orderBy: { isDefault: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const currentPrices = await this.currentPrices(orgId, id);
    return { ...customer, currentPrices };
  }

  async update(orgId: string, id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(orgId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    await this.ensureExists(orgId, id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Addresses ──
  async addAddress(orgId: string, customerId: string, dto: CreateCustomerAddressDto) {
    await this.ensureExists(orgId, customerId);
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.customerAddress.create({ data: { customerId, ...dto } });
  }

  async listAddresses(orgId: string, customerId: string) {
    await this.ensureExists(orgId, customerId);
    return this.prisma.customerAddress.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { isDefault: 'desc' },
    });
  }

  async removeAddress(orgId: string, customerId: string, addressId: string) {
    await this.ensureExists(orgId, customerId);
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { deletedAt: new Date() },
    });
  }

  // ── Prices (append-only history) ──
  async addPrice(orgId: string, customerId: string, dto: CreateCustomerPriceDto) {
    await this.ensureExists(orgId, customerId);
    return this.prisma.customerPrice.create({
      data: {
        orgId,
        customerId,
        brickClass: dto.brickClass,
        pricePerBrickPaise: dto.pricePerBrickPaise,
        effectiveFrom: new Date(dto.effectiveFrom),
        note: dto.note,
      },
    });
  }

  async listPrices(orgId: string, customerId: string) {
    await this.ensureExists(orgId, customerId);
    return this.prisma.customerPrice.findMany({
      where: { customerId },
      orderBy: [{ brickClass: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  /** Latest price per brick class effective on/before the given date. */
  async currentPrices(orgId: string, customerId: string, asOf: Date = new Date()) {
    const rows = await this.prisma.customerPrice.findMany({
      where: { customerId, effectiveFrom: { lte: asOf } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const byClass = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byClass.has(row.brickClass)) byClass.set(row.brickClass, row);
    }
    return Array.from(byClass.values());
  }

  private async ensureExists(orgId: string, id: string) {
    const exists = await this.prisma.customer.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Customer not found');
  }
}
