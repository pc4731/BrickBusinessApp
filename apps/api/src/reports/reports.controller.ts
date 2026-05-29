import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('pnl')
  pnl(@CurrentOrg() orgId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reports.profitAndLoss(orgId, { dateFrom, dateTo });
  }

  @Get('trends')
  trends(@CurrentOrg() orgId: string, @Query('months') months?: string) {
    return this.reports.monthlyTrends(orgId, months ? Number(months) : 6);
  }

  @Get('daily-sales')
  dailySales(@CurrentOrg() orgId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reports.dailySales(orgId, { dateFrom, dateTo });
  }

  @Get('purchases')
  purchases(@CurrentOrg() orgId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reports.purchaseRegister(orgId, { dateFrom, dateTo });
  }

  @Get('payments')
  payments(@CurrentOrg() orgId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reports.paymentReport(orgId, { dateFrom, dateTo });
  }

  @Get('expenses')
  expenses(@CurrentOrg() orgId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reports.expenseReport(orgId, { dateFrom, dateTo });
  }

  @Get('gst')
  gst(@CurrentOrg() orgId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reports.gstReport(orgId, { dateFrom, dateTo });
  }

  @Get('stock')
  stock(@CurrentOrg() orgId: string) {
    return this.reports.stockReport(orgId);
  }

  @Get('customer/:customerId')
  customerStatement(
    @CurrentOrg() orgId: string,
    @Param('customerId') customerId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.customerStatement(orgId, customerId, { dateFrom, dateTo });
  }
}
