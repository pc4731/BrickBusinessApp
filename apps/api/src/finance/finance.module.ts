import { Module } from '@nestjs/common';
import { PostingService } from './posting.service';
import { LedgerService } from './ledger.service';
import { FinanceController } from './finance.controller';

@Module({
  controllers: [FinanceController],
  providers: [PostingService, LedgerService],
  exports: [PostingService, LedgerService],
})
export class FinanceModule {}
