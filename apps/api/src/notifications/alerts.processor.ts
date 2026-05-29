import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

export const ALERTS_QUEUE = 'alerts';

/** Periodically recomputes alerts for every org (low stock, dues). */
@Processor(ALERTS_QUEUE)
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process() {
    const result = await this.notifications.refreshAllOrgs();
    this.logger.log(`Refreshed alerts for ${result.orgs} org(s)`);
  }
}
