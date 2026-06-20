import { Injectable, BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ReportsService } from '../reports/reports.service';

interface DateRange {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  renter?: string;
}

const rupees = (paise: number) => Math.round(paise) / 100;
const MONEY_FMT = '#,##0.00';

@Injectable()
export class ExcelService {
  constructor(private readonly reports: ReportsService) {}

  async generate(orgId: string, report: string, range: DateRange): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Brick ERP';
    wb.created = new Date();

    switch (report) {
      case 'pnl':
        await this.pnl(wb, orgId, range);
        break;
      case 'daily-sales':
        await this.dailySales(wb, orgId, range);
        break;
      case 'purchases':
        await this.purchases(wb, orgId, range);
        break;
      case 'payments':
        await this.payments(wb, orgId, range);
        break;
      case 'expenses':
        await this.expenses(wb, orgId, range);
        break;
      case 'gst':
        await this.gst(wb, orgId, range);
        break;
      case 'stock':
        await this.stock(wb, orgId);
        break;
      case 'customer-statement':
        if (!range.customerId) throw new BadRequestException('customerId is required');
        await this.customerStatement(wb, orgId, range.customerId, range);
        break;
      case 'rental-statement':
        if (!range.renter) throw new BadRequestException('renter is required');
        await this.rentalStatement(wb, orgId, range.renter, range);
        break;
      default:
        throw new BadRequestException(`Unknown report: ${report}`);
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private header(ws: ExcelJS.Worksheet) {
    ws.getRow(1).font = { bold: true };
  }

  private moneyCol(ws: ExcelJS.Worksheet, keys: string[]) {
    for (const k of keys) {
      const col = ws.getColumn(k);
      col.numFmt = MONEY_FMT;
    }
  }

  private async pnl(wb: ExcelJS.Workbook, orgId: string, range: DateRange) {
    const d = await this.reports.profitAndLoss(orgId, range);
    const ws = wb.addWorksheet('Profit & Loss');
    ws.columns = [
      { header: 'Line', key: 'line', width: 36 },
      { header: 'Amount (₹)', key: 'amount', width: 18 },
    ];
    this.header(ws);
    ws.addRows([
      { line: 'Revenue', amount: rupees(d.revenuePaise) },
      { line: 'COGS', amount: -rupees(d.cogsPaise) },
      { line: 'Gross profit', amount: rupees(d.grossProfitPaise) },
      { line: 'Truck expenses', amount: -rupees(d.truckExpensePaise) },
      { line: 'General expenses', amount: -rupees(d.generalExpensePaise) },
      { line: 'Net profit', amount: rupees(d.netProfitPaise) },
      { line: 'GST collected (output)', amount: rupees(d.gstOutputPaise) },
    ]);
    this.moneyCol(ws, ['amount']);
  }

  private async dailySales(wb: ExcelJS.Workbook, orgId: string, range: DateRange) {
    const rows = await this.reports.dailySales(orgId, range);
    const ws = wb.addWorksheet('Daily Sales');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: 'Sales', key: 'sales', width: 16 },
      { header: 'COGS', key: 'cogs', width: 16 },
      { header: 'GST', key: 'tax', width: 14 },
      { header: 'Gross profit', key: 'profit', width: 16 },
    ];
    this.header(ws);
    rows.forEach((r) =>
      ws.addRow({
        date: r.date,
        orders: r.orders,
        sales: rupees(r.salesPaise),
        cogs: rupees(r.cogsPaise),
        tax: rupees(r.taxPaise),
        profit: rupees(r.grossProfitPaise),
      }),
    );
    this.moneyCol(ws, ['sales', 'cogs', 'tax', 'profit']);
  }

  private async purchases(wb: ExcelJS.Workbook, orgId: string, range: DateRange) {
    const { rows, totalPaise } = await this.reports.purchaseRegister(orgId, range);
    const ws = wb.addWorksheet('Purchase Register');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Factory', key: 'factory', width: 28 },
      { header: 'Qty (bricks)', key: 'qty', width: 14 },
      { header: 'Amount', key: 'amount', width: 16 },
    ];
    this.header(ws);
    rows.forEach((r) =>
      ws.addRow({ date: r.date, type: r.type, factory: r.factory, qty: r.qtyBricks, amount: rupees(r.amountPaise) }),
    );
    ws.addRow({ factory: 'TOTAL', amount: rupees(totalPaise) }).font = { bold: true };
    this.moneyCol(ws, ['amount']);
  }

  private async payments(wb: ExcelJS.Workbook, orgId: string, range: DateRange) {
    const { rows, receivedPaise, paidPaise, netPaise } = await this.reports.paymentReport(orgId, range);
    const ws = wb.addWorksheet('Payments');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Direction', key: 'dir', width: 12 },
      { header: 'Party', key: 'party', width: 28 },
      { header: 'Mode', key: 'mode', width: 14 },
      { header: 'Amount', key: 'amount', width: 16 },
    ];
    this.header(ws);
    rows.forEach((r) =>
      ws.addRow({ date: r.date, dir: r.direction === 'IN' ? 'Received' : 'Paid', party: r.party, mode: r.mode, amount: rupees(r.amountPaise) }),
    );
    ws.addRow({});
    ws.addRow({ party: 'Received', amount: rupees(receivedPaise) });
    ws.addRow({ party: 'Paid', amount: rupees(paidPaise) });
    ws.addRow({ party: 'Net', amount: rupees(netPaise) }).font = { bold: true };
    this.moneyCol(ws, ['amount']);
  }

  private async expenses(wb: ExcelJS.Workbook, orgId: string, range: DateRange) {
    const { rows, totalPaise } = await this.reports.expenseReport(orgId, range);
    const ws = wb.addWorksheet('Expenses');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Reference', key: 'ref', width: 24 },
      { header: 'Amount', key: 'amount', width: 16 },
    ];
    this.header(ws);
    rows.forEach((r) => ws.addRow({ date: r.date, category: r.category, ref: r.ref, amount: rupees(r.amountPaise) }));
    ws.addRow({ ref: 'TOTAL', amount: rupees(totalPaise) }).font = { bold: true };
    this.moneyCol(ws, ['amount']);
  }

  private async gst(wb: ExcelJS.Workbook, orgId: string, range: DateRange) {
    const { rows, totals } = await this.reports.gstReport(orgId, range);
    const ws = wb.addWorksheet('GST');
    ws.columns = [
      { header: 'Order', key: 'order', width: 16 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Taxable', key: 'taxable', width: 16 },
      { header: 'CGST', key: 'cgst', width: 12 },
      { header: 'SGST', key: 'sgst', width: 12 },
      { header: 'IGST', key: 'igst', width: 12 },
      { header: 'Total tax', key: 'tax', width: 14 },
    ];
    this.header(ws);
    rows.forEach((r) =>
      ws.addRow({
        order: r.orderNumber,
        date: r.date,
        customer: r.customer,
        gstin: r.gstin,
        taxable: rupees(r.taxablePaise),
        cgst: rupees(r.cgstPaise),
        sgst: rupees(r.sgstPaise),
        igst: rupees(r.igstPaise),
        tax: rupees(r.totalTaxPaise),
      }),
    );
    ws.addRow({
      customer: 'TOTAL',
      taxable: rupees(totals.taxablePaise),
      cgst: rupees(totals.cgstPaise),
      sgst: rupees(totals.sgstPaise),
      igst: rupees(totals.igstPaise),
      tax: rupees(totals.totalTaxPaise),
    }).font = { bold: true };
    this.moneyCol(ws, ['taxable', 'cgst', 'sgst', 'igst', 'tax']);
  }

  private async stock(wb: ExcelJS.Workbook, orgId: string) {
    const rows = await this.reports.stockReport(orgId);
    const ws = wb.addWorksheet('Stock');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Factory', key: 'factory', width: 24 },
      { header: 'Class', key: 'cls', width: 10 },
      { header: 'Purchased', key: 'purchased', width: 12 },
      { header: 'Sold', key: 'sold', width: 12 },
      { header: 'Reserved', key: 'reserved', width: 12 },
      { header: 'Available', key: 'available', width: 12 },
      { header: 'Rate/brick (₹)', key: 'rate', width: 14 },
    ];
    this.header(ws);
    rows.forEach((r) =>
      ws.addRow({
        date: r.date,
        factory: r.factory,
        cls: r.brickClass,
        purchased: r.purchased,
        sold: r.sold,
        reserved: r.reserved,
        available: r.available,
        rate: rupees(r.ratePaise),
      }),
    );
    this.moneyCol(ws, ['rate']);
  }

  private async customerStatement(
    wb: ExcelJS.Workbook,
    orgId: string,
    customerId: string,
    range: DateRange,
  ) {
    const s = await this.reports.customerStatement(orgId, customerId, range);

    const ordersWs = wb.addWorksheet('Orders');
    ordersWs.addRow([`Customer statement — ${s.customer.name}`]).font = { bold: true, size: 14 };
    ordersWs.addRow([`Phone: ${s.customer.phone}${s.customer.gstin ? ` · GSTIN: ${s.customer.gstin}` : ''}`]);
    ordersWs.addRow([
      `Billed (delivered): ${rupees(s.totals.billedDeliveredPaise)}`,
      `Paid: ${rupees(s.totals.totalPaidPaise)}`,
      `Advance: ${rupees(s.totals.advancePaise)}`,
      `Net pending: ${rupees(s.totals.netPendingPaise)}`,
    ]);
    ordersWs.addRow([]);

    const headerRow = ordersWs.addRow([
      'Order', 'Order date', 'Delivery', 'Status', 'Type', 'Class',
      'Qty ordered', 'Qty delivered', 'Truck', 'Driver', 'Invoice', 'Paid', 'Balance',
    ]);
    headerRow.font = { bold: true };
    s.orders.forEach((o) =>
      ordersWs.addRow([
        o.orderNumber, o.orderDate, o.deliveryDate ?? '', o.status, o.orderType, o.brickClass,
        o.qtyOrdered, o.qtyDelivered ?? '', o.truckNumber ?? `${o.truckType}`, o.driverName ?? '',
        rupees(o.invoicePaise), rupees(o.paidPaise), rupees(o.balancePaise),
      ]),
    );
    [11, 12, 13].forEach((c) => (ordersWs.getColumn(c).numFmt = MONEY_FMT));
    ordersWs.columns.forEach((c) => (c.width = Math.max(c.width ?? 10, 12)));

    const payWs = wb.addWorksheet('Payments');
    payWs.addRow(['Date', 'Order', 'Mode', 'Type', 'Amount', 'Remarks']).font = { bold: true };
    s.payments.forEach((p) =>
      payWs.addRow([p.date, p.orderNumber ?? 'Advance', p.mode, p.type, rupees(p.amountPaise), p.remarks ?? '']),
    );
    payWs.getColumn(5).numFmt = MONEY_FMT;
    payWs.columns.forEach((c) => (c.width = Math.max(c.width ?? 10, 14)));
  }

  private async rentalStatement(
    wb: ExcelJS.Workbook,
    orgId: string,
    renter: string,
    range: DateRange,
  ) {
    const s = await this.reports.rentalStatement(orgId, renter, range);

    const ws = wb.addWorksheet('Rentals');
    ws.addRow([`Rental statement — ${s.renter}`]).font = { bold: true, size: 14 };
    ws.addRow([
      `Agreed rent: ${rupees(s.totals.totalRentPaise)}`,
      `Paid: ${rupees(s.totals.totalPaidPaise)}`,
      `Pending: ${rupees(s.totals.pendingPaise)}`,
    ]);
    ws.addRow([]);

    const headerRow = ws.addRow([
      'Truck', 'Start', 'End', 'Status', 'Agreed rent', 'Paid', 'Pending', 'Notes',
    ]);
    headerRow.font = { bold: true };
    s.rentals.forEach((r) =>
      ws.addRow([
        r.truckNumber, r.startDate, r.endDate ?? '', r.status,
        rupees(r.rentAmountPaise), rupees(r.paidPaise), rupees(r.pendingPaise), r.notes ?? '',
      ]),
    );
    [5, 6, 7].forEach((c) => (ws.getColumn(c).numFmt = MONEY_FMT));
    ws.columns.forEach((c) => (c.width = Math.max(c.width ?? 10, 12)));

    const payWs = wb.addWorksheet('Rent payments');
    payWs.addRow(['Date', 'Truck', 'Mode', 'Amount', 'Remarks']).font = { bold: true };
    s.payments.forEach((p) =>
      payWs.addRow([p.date, p.truckNumber, p.mode, rupees(p.amountPaise), p.remarks ?? '']),
    );
    payWs.getColumn(4).numFmt = MONEY_FMT;
    payWs.columns.forEach((c) => (c.width = Math.max(c.width ?? 10, 14)));
  }
}
