import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { DocumentType } from '@brick/db';
import type { OrderFinancials } from '@brick/utils';
import { paisePerBrickToRatePerThousand } from '@brick/utils';

export interface DocumentData {
  type: DocumentType;
  number: string;
  date: Date;
  org: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    gstin?: string | null;
    phone?: string | null;
  };
  customer: { name: string; phone?: string | null; gstin?: string | null; address?: string | null };
  order: {
    orderNumber: string;
    brickClass: string;
    qty: number;
    sellingPricePerBrickPaise: number;
    isGst: boolean;
  };
  summary: OrderFinancials;
}

const TITLES: Record<DocumentType, string> = {
  INVOICE: 'TAX INVOICE',
  CHALLAN: 'DELIVERY CHALLAN',
  RECEIPT: 'PAYMENT RECEIPT',
  TRANSPORT_SLIP: 'TRANSPORT SLIP',
};

// pdfkit's built-in fonts lack the ₹ glyph, so render money as "Rs.".
const inr = (paise: number) =>
  `Rs. ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

@Injectable()
export class PdfService {
  build(data: DocumentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header — business
      doc.fontSize(18).font('Helvetica-Bold').text(data.org.name);
      doc.fontSize(9).font('Helvetica').fillColor('#555');
      const orgLines = [
        [data.org.address, data.org.city, data.org.state].filter(Boolean).join(', '),
        data.org.gstin ? `GSTIN: ${data.org.gstin}` : '',
        data.org.phone ? `Phone: ${data.org.phone}` : '',
      ].filter(Boolean);
      orgLines.forEach((l) => doc.text(l));
      doc.fillColor('#000');

      // Title
      doc.moveDown();
      doc.fontSize(14).font('Helvetica-Bold').text(TITLES[data.type], { align: 'right' });
      doc.fontSize(9).font('Helvetica');
      doc.text(`No: ${data.number}`, { align: 'right' });
      doc.text(`Date: ${data.date.toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.text(`Order: ${data.order.orderNumber}`, { align: 'right' });

      // Bill to
      doc.moveDown();
      doc.fontSize(10).font('Helvetica-Bold').text('Bill To:');
      doc.font('Helvetica').fontSize(9);
      doc.text(data.customer.name);
      if (data.customer.address) doc.text(data.customer.address);
      if (data.customer.phone) doc.text(`Phone: ${data.customer.phone}`);
      if (data.customer.gstin) doc.text(`GSTIN: ${data.customer.gstin}`);

      // Line item table
      doc.moveDown();
      const top = doc.y;
      const cols = { item: 50, qty: 280, rate: 360, amount: 460 };
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Description', cols.item, top);
      doc.text('Qty (×1000)', cols.qty, top);
      doc.text('Rate/1000', cols.rate, top);
      doc.text('Amount', cols.amount, top);
      doc.moveTo(50, top + 14).lineTo(545, top + 14).stroke();

      const rowY = top + 20;
      doc.font('Helvetica').fontSize(9);
      doc.text(`${data.order.brickClass} class bricks`, cols.item, rowY);
      doc.text((data.order.qty / 1000).toString(), cols.qty, rowY);
      doc.text(inr(Math.round(paisePerBrickToRatePerThousand(data.order.sellingPricePerBrickPaise) * 100)), cols.rate, rowY);
      doc.text(inr(data.summary.taxableValuePaise), cols.amount, rowY);

      // Totals
      let y = rowY + 30;
      const line = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.text(label, cols.rate, y);
        doc.text(value, cols.amount, y);
        y += 16;
      };
      doc.moveTo(350, y - 6).lineTo(545, y - 6).stroke();
      line('Taxable value', inr(data.summary.taxableValuePaise));
      if (data.order.isGst && data.summary.totalTaxPaise > 0) {
        if (data.summary.igstPaise > 0) {
          line('IGST', inr(data.summary.igstPaise));
        } else {
          line('CGST', inr(data.summary.cgstPaise));
          line('SGST', inr(data.summary.sgstPaise));
        }
      }
      line('Total', inr(data.summary.invoiceTotalPaise), true);

      // Footer
      doc.font('Helvetica').fontSize(8).fillColor('#777');
      doc.text('This is a computer-generated document.', 50, 760, { align: 'center', width: 495 });

      doc.end();
    });
  }
}
