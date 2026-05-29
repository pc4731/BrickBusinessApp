import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SyncOperation, SyncStatus } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from '../orders/dto/order.dto';
import { CreateCustomerPaymentDto } from '../payments/dto/payment.dto';
import { SyncOperationDto, SyncRequestDto, SyncResult } from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  async process(orgId: string, userId: string, dto: SyncRequestDto): Promise<{ results: SyncResult[] }> {
    const results: SyncResult[] = [];
    for (const op of dto.operations) {
      results.push(await this.applyOne(orgId, userId, op));
    }
    return { results };
  }

  private async applyOne(orgId: string, userId: string, op: SyncOperationDto): Promise<SyncResult> {
    // Idempotent replay: a previously-synced op returns its stored result.
    const existing = await this.prisma.syncQueueEntry.findUnique({ where: { clientUuid: op.clientUuid } });
    if (existing?.status === SyncStatus.SYNCED) {
      return { clientUuid: op.clientUuid, status: 'synced', entityId: existing.entityId ?? undefined };
    }

    try {
      const entityId = await this.applyOperation(orgId, userId, op);
      await this.record(orgId, userId, op, SyncStatus.SYNCED, { entityId });
      return { clientUuid: op.clientUuid, status: 'synced', entityId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      await this.record(orgId, userId, op, SyncStatus.FAILED, { error: message });
      return { clientUuid: op.clientUuid, status: 'failed', error: message };
    }
  }

  private async applyOperation(orgId: string, userId: string, op: SyncOperationDto): Promise<string> {
    if (op.entityType === 'order') {
      const dto = await this.validatePayload(CreateOrderDto, op.payload);
      const order = await this.orders.create(orgId, userId, dto);
      return order.id;
    }
    if (op.entityType === 'customer_payment') {
      const dto = await this.validatePayload(CreateCustomerPaymentDto, op.payload);
      const payment = await this.payments.createCustomerPayment(orgId, userId, dto);
      return payment.id;
    }
    throw new Error(`Unsupported entityType: ${op.entityType}`);
  }

  private async validatePayload<T extends object>(
    cls: new () => T,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const instance = plainToInstance(cls, payload, { enableImplicitConversion: true });
    const errors = await validate(instance as object, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new Error(`Invalid payload: ${messages.join(', ')}`);
    }
    return instance;
  }

  private async record(
    orgId: string,
    userId: string,
    op: SyncOperationDto,
    status: SyncStatus,
    response: { entityId?: string; error?: string },
  ) {
    const data = {
      orgId,
      userId,
      deviceId: op.deviceId,
      operation: SyncOperation.CREATE,
      entityType: op.entityType,
      entityId: response.entityId,
      payload: op.payload as object,
      clientTimestamp: new Date(op.clientTimestamp),
      status,
      serverResponse: response as object,
      syncedAt: status === SyncStatus.SYNCED ? new Date() : null,
    };
    await this.prisma.syncQueueEntry.upsert({
      where: { clientUuid: op.clientUuid },
      create: { clientUuid: op.clientUuid, ...data },
      update: data,
    });
  }
}
