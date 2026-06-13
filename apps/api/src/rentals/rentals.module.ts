import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({
  imports: [FinanceModule],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
