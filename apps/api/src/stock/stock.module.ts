import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [FinanceModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
