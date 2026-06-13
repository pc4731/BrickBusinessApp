import { Injectable, Logger } from '@nestjs/common';
import { DEFAULT_ORG_SETTINGS, type OrgSettings } from '@brick/types';
import type { DocumentType } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { computeOrderSummary } from '../orders/order-financials.util';
import { PdfService } from './pdf.service';
import { StorageService } from './storage.service';

interface GenerateInput {
  orgId: string;
  documentId: string;
  orderId: string;
  type: DocumentType;
}

/**
 * Builds a document PDF, stores it, and marks the GeneratedDocument READY.
 * Runs synchronously inside the request (PDF generation is sub-second), which
 * removes the need for a BullMQ worker — Vercel serverless has no background
 * worker process to host one.
 */
@Injectable()
export class DocumentGenerator {
  private readonly logger = new Logger(DocumentGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
    private readonly storage: StorageService,
  ) {}

  async generate({ orgId, documentId, orderId, type }: GenerateInput) {
    try {
      const [order, org, doc] = await Promise.all([
        this.prisma.order.findFirstOrThrow({
          where: { id: orderId, orgId },
          include: {
            customer: { select: { name: true, phone: true, gstin: true } },
            customerAddress: true,
            stockItems: true,
          },
        }),
        this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
        this.prisma.generatedDocument.findUniqueOrThrow({ where: { id: documentId } }),
      ]);

      const settings: OrgSettings = {
        ...DEFAULT_ORG_SETTINGS,
        ...((org.settings as Partial<OrgSettings>) ?? {}),
      };
      const interState =
        Boolean(org.state) &&
        Boolean(order.customerAddress?.state) &&
        org.state!.trim().toLowerCase() !== order.customerAddress!.state!.trim().toLowerCase();
      const summary = computeOrderSummary(order, settings, interState);

      const pdf = await this.pdf.build({
        type,
        number: doc.number,
        date: new Date(),
        org: {
          name: org.name,
          address: org.address,
          city: org.city,
          state: org.state,
          gstin: org.gstin,
          phone: org.phone,
        },
        customer: {
          name: order.customer.name,
          phone: order.customer.phone,
          gstin: order.customer.gstin,
          address: order.customerAddress?.fullAddress ?? null,
        },
        order: {
          orderNumber: order.orderNumber,
          brickClass: order.brickClass,
          qty: order.qtyDelivered ?? order.qtyOrdered,
          sellingPricePerBrickPaise: order.sellingPricePerBrickPaise,
          isGst: order.isGst,
        },
        summary,
      });

      const url = await this.storage.save(orgId, `${doc.number}.pdf`, pdf);
      await this.prisma.generatedDocument.update({
        where: { id: documentId },
        data: { status: 'READY', url },
      });

      // Freeze a GST invoice record on first invoice generation (immutable
      // numbering + tax split); later regenerations just refresh the PDF link.
      if (type === 'INVOICE') {
        const existing = await this.prisma.invoice.findFirst({ where: { orgId, orderId } });
        if (!existing) {
          await this.prisma.invoice.create({
            data: {
              orgId,
              orderId,
              invoiceNumber: doc.number,
              invoiceDate: new Date(),
              subtotalPaise: summary.taxableValuePaise,
              gstRate: order.gstRate,
              cgstPaise: summary.cgstPaise,
              sgstPaise: summary.sgstPaise,
              igstPaise: summary.igstPaise,
              totalPaise: summary.invoiceTotalPaise,
              isGstInvoice: order.isGst,
              pdfUrl: url,
            },
          });
        } else {
          await this.prisma.invoice.update({ where: { id: existing.id }, data: { pdfUrl: url } });
        }
      }
    } catch (err) {
      this.logger.error(`Document ${documentId} failed`, err as Error);
      await this.prisma.generatedDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }
}
