import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JournalRefType, PaymentMode, TruckRentalStatus } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { PostingService } from '../finance/posting.service';
import { PaginationQueryDto, paginate } from '../common/dto/pagination.dto';
import {
  CreateRentalPaymentDto,
  CreateTruckRentalDto,
  UpdateRentalStatusDto,
} from './dto/rental.dto';

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posting: PostingService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateTruckRentalDto) {
    await this.assertOwnTruck(orgId, dto.ownTruckId);
    // A truck can only be lent to one renter at a time.
    const active = await this.prisma.truckRental.findFirst({
      where: { orgId, ownTruckId: dto.ownTruckId, status: TruckRentalStatus.ACTIVE, deletedAt: null },
      select: { id: true },
    });
    if (active) throw new ConflictException('This truck is already lent out (active rental)');

    const startDate = new Date(dto.startDate);
    return this.prisma.$transaction(async (tx) => {
      const rental = await tx.truckRental.create({
        data: {
          orgId,
          ownTruckId: dto.ownTruckId,
          renterName: dto.renterName,
          renterPhone: dto.renterPhone,
          rentAmountPaise: dto.rentAmountPaise,
          startDate,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          notes: dto.notes,
          createdById: userId,
        },
      });
      // Recognise the full agreed rent as income up front (receivable until paid).
      await this.posting.postTruckRental(tx, {
        orgId,
        rentalId: rental.id,
        ownTruckId: dto.ownTruckId,
        amountPaise: dto.rentAmountPaise,
        entryDate: startDate,
        description: `Truck rent — ${dto.renterName}`,
        createdById: userId,
      });
      return rental;
    });
  }

  async findAll(
    orgId: string,
    query: PaginationQueryDto,
    filter: { status?: string; ownTruckId?: string } = {},
  ) {
    const where = {
      orgId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status as TruckRentalStatus } : {}),
      ...(filter.ownTruckId ? { ownTruckId: filter.ownTruckId } : {}),
      ...(query.search
        ? { renterName: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.truckRental.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { ownTruck: { select: { number: true } } },
      }),
      this.prisma.truckRental.count({ where }),
    ]);
    const withDues = await this.attachDues(data);
    return paginate(withDues, total, query.page, query.limit);
  }

  async findOne(orgId: string, id: string) {
    const rental = await this.prisma.truckRental.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { ownTruck: { select: { number: true } } },
    });
    if (!rental) throw new NotFoundException('Rental not found');
    const [withDues] = await this.attachDues([rental]);
    return withDues;
  }

  async updateStatus(orgId: string, id: string, userId: string, dto: UpdateRentalStatusDto) {
    const rental = await this.ensure(orgId, id);
    const next = dto.status as TruckRentalStatus;

    // Cancelling voids the agreement: reverse the income accrual. Only safe when
    // nothing has been collected yet (otherwise delete the collected payments first).
    if (next === TruckRentalStatus.CANCELLED) {
      const paid = await this.paidPaise(id);
      if (paid > 0) {
        throw new BadRequestException(
          'Cannot cancel a rental with recorded payments — delete the payments first',
        );
      }
      return this.prisma.$transaction(async (tx) => {
        await this.posting.reverse(tx, {
          orgId,
          refType: JournalRefType.TRUCK_RENTAL,
          refId: id,
          entryDate: new Date(),
          reason: 'truck rental cancelled',
          createdById: userId,
        });
        return tx.truckRental.update({ where: { id }, data: { status: next } });
      });
    }

    return this.prisma.truckRental.update({ where: { id }, data: { status: next } });
  }

  // ── Rent payments ───────────────────────────────────────────────────
  async recordPayment(orgId: string, userId: string, rentalId: string, dto: CreateRentalPaymentDto) {
    const rental = await this.ensure(orgId, rentalId);
    if (rental.status === TruckRentalStatus.CANCELLED) {
      throw new BadRequestException('Cannot record rent against a cancelled rental');
    }
    const paid = await this.paidPaise(rentalId);
    const pending = rental.rentAmountPaise - paid;
    if (dto.amountPaise > pending) {
      throw new BadRequestException(
        `Amount exceeds rent still due (${pending} paise remaining)`,
      );
    }

    const paymentDate = new Date(dto.paymentDate);
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.truckRentalPayment.create({
        data: {
          orgId,
          truckRentalId: rentalId,
          amountPaise: dto.amountPaise,
          paymentMode: dto.paymentMode as PaymentMode,
          paymentDate,
          remarks: dto.remarks,
          createdById: userId,
        },
      });
      await this.posting.postTruckRentalPayment(tx, {
        orgId,
        paymentId: payment.id,
        rentalId,
        ownTruckId: rental.ownTruckId,
        mode: dto.paymentMode as PaymentMode,
        amountPaise: dto.amountPaise,
        entryDate: paymentDate,
        createdById: userId,
      });
      return payment;
    });
  }

  async listPayments(orgId: string, rentalId: string) {
    await this.ensure(orgId, rentalId);
    return this.prisma.truckRentalPayment.findMany({
      where: { orgId, truckRentalId: rentalId, deletedAt: null },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async removePayment(orgId: string, userId: string, paymentId: string) {
    const payment = await this.prisma.truckRentalPayment.findFirst({
      where: { id: paymentId, orgId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.truckRentalPayment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });
      await this.posting.reverse(tx, {
        orgId,
        refType: JournalRefType.TRUCK_RENTAL_PAYMENT,
        refId: paymentId,
        entryDate: new Date(),
        reason: 'rent payment deleted',
        createdById: userId,
      });
    });
    return { ok: true };
  }

  async remove(orgId: string, userId: string, id: string) {
    await this.ensure(orgId, id);
    await this.prisma.$transaction(async (tx) => {
      const payments = await tx.truckRentalPayment.findMany({
        where: { orgId, truckRentalId: id, deletedAt: null },
        select: { id: true },
      });
      // Reverse every rent payment, then the income accrual, then soft-delete.
      for (const p of payments) {
        await tx.truckRentalPayment.update({ where: { id: p.id }, data: { deletedAt: new Date() } });
        await this.posting.reverse(tx, {
          orgId,
          refType: JournalRefType.TRUCK_RENTAL_PAYMENT,
          refId: p.id,
          entryDate: new Date(),
          reason: 'rental deleted',
          createdById: userId,
        });
      }
      await this.posting.reverse(tx, {
        orgId,
        refType: JournalRefType.TRUCK_RENTAL,
        refId: id,
        entryDate: new Date(),
        reason: 'rental deleted',
        createdById: userId,
      });
      await tx.truckRental.update({ where: { id }, data: { deletedAt: new Date() } });
    });
    return { ok: true };
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private async ensure(orgId: string, id: string) {
    const rental = await this.prisma.truckRental.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!rental) throw new NotFoundException('Rental not found');
    return rental;
  }

  private async assertOwnTruck(orgId: string, id: string) {
    const t = await this.prisma.ownTruck.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!t) throw new BadRequestException('Own truck not found');
  }

  private async paidPaise(rentalId: string): Promise<number> {
    const agg = await this.prisma.truckRentalPayment.aggregate({
      where: { truckRentalId: rentalId, deletedAt: null },
      _sum: { amountPaise: true },
    });
    return agg._sum.amountPaise ?? 0;
  }

  /** Annotate each rental with paidPaise / pendingPaise from its payments. */
  private async attachDues<T extends { id: string; rentAmountPaise: number }>(rentals: T[]) {
    if (rentals.length === 0) return [] as (T & { paidPaise: number; pendingPaise: number })[];
    const sums = await this.prisma.truckRentalPayment.groupBy({
      by: ['truckRentalId'],
      where: { truckRentalId: { in: rentals.map((r) => r.id) }, deletedAt: null },
      _sum: { amountPaise: true },
      orderBy: { truckRentalId: 'asc' },
    });
    const paidById = new Map(sums.map((s) => [s.truckRentalId, s._sum.amountPaise ?? 0]));
    return rentals.map((r) => {
      const paidPaise = paidById.get(r.id) ?? 0;
      return { ...r, paidPaise, pendingPaise: r.rentAmountPaise - paidPaise };
    });
  }
}
