import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FinanceModule } from '../finance/finance.module';
import { StockModule } from '../stock/stock.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AlertsProcessor, ALERTS_QUEUE } from './alerts.processor';

@Module({
  imports: [FinanceModule, StockModule, BullModule.registerQueue({ name: ALERTS_QUEUE })],
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(@InjectQueue(ALERTS_QUEUE) private readonly queue: Queue) {}

  // Schedule the hourly alert refresh (idempotent by repeat key).
  async onModuleInit() {
    await this.queue.add(
      'refresh-all',
      {},
      { repeat: { pattern: '0 * * * *' }, removeOnComplete: true, removeOnFail: 100 },
    );
  }
}
