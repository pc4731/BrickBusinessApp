import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { DocumentType } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';

const PREFIX: Record<DocumentType, string> = {
  INVOICE: 'INV',
  CHALLAN: 'CHL',
  RECEIPT: 'RCP',
  TRANSPORT_SLIP: 'TRS',
};

export const DOCUMENTS_QUEUE = 'documents';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DOCUMENTS_QUEUE) private readonly queue: Queue,
  ) {}

  /** Create a PENDING document record and enqueue its PDF generation. */
  async requestDocument(orgId: string, userId: string, type: DocumentType, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!order) throw new BadRequestException('Order not found');

    const year = new Date().getFullYear();
    const count = await this.prisma.generatedDocument.count({
      where: { orgId, type, number: { startsWith: `${PREFIX[type]}-${year}-` } },
    });
    const number = `${PREFIX[type]}-${year}-${String(count + 1).padStart(4, '0')}`;

    const doc = await this.prisma.generatedDocument.create({
      data: { orgId, orderId, type, number, status: 'PENDING', createdById: userId },
    });

    await this.queue.add(
      'generate',
      { orgId, documentId: doc.id, orderId, type },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true },
    );
    return doc;
  }

  async getDocument(orgId: string, id: string) {
    const doc = await this.prisma.generatedDocument.findFirst({ where: { id, orgId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  listForOrder(orgId: string, orderId: string) {
    return this.prisma.generatedDocument.findMany({
      where: { orgId, orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
