import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentType } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentGenerator } from './document-generator.service';

const PREFIX: Record<DocumentType, string> = {
  INVOICE: 'INV',
  CHALLAN: 'CHL',
  RECEIPT: 'RCP',
  TRANSPORT_SLIP: 'TRS',
};

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: DocumentGenerator,
  ) {}

  /** Create a document record and generate its PDF synchronously. */
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

    // Generate inline (sub-second) and return the READY record. The web client
    // polls getDocument() and will see READY on its first poll.
    await this.generator.generate({ orgId, documentId: doc.id, orderId, type });
    return this.getDocument(orgId, doc.id);
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
