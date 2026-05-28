import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { LedgerService } from './ledger.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('dashboard')
  dashboard(
    @CurrentOrg() orgId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ledger.dashboard(orgId, { dateFrom, dateTo });
  }

  @Get('dues/customers')
  customerDues(@CurrentOrg() orgId: string) {
    return this.ledger.customerDues(orgId);
  }

  @Get('dues/factories')
  factoryDues(@CurrentOrg() orgId: string) {
    return this.ledger.factoryDues(orgId);
  }

  @Get('ledger/customer/:customerId')
  customerLedger(@CurrentOrg() orgId: string, @Param('customerId') customerId: string) {
    return this.ledger.customerLedger(orgId, customerId);
  }

  @Get('ledger/factory/:factoryId')
  factoryLedger(@CurrentOrg() orgId: string, @Param('factoryId') factoryId: string) {
    return this.ledger.factoryLedger(orgId, factoryId);
  }

  @Get('cashbook')
  cashbook(
    @CurrentOrg() orgId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.ledger.cashbook(orgId, { dateFrom, dateTo });
  }
}
