import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { StockModule } from '../stock/stock.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { CronController } from './cron.controller';

@Module({
  imports: [FinanceModule, StockModule],
  controllers: [NotificationsController, CronController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
