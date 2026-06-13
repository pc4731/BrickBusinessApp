import { Controller, ForbiddenException, Get, Headers, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import type { AppConfig } from '../config/configuration';
import { NotificationsService } from './notifications.service';

/**
 * Cron-triggered jobs. On Vercel, the scheduler (configured in vercel.json)
 * sends a GET request with an `Authorization: Bearer <CRON_SECRET>` header.
 * Replaces the old BullMQ repeat job — Vercel serverless has no worker to host
 * a recurring queue.
 */
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @SkipThrottle()
  @Get('refresh-alerts')
  async refreshAlerts(@Headers('authorization') auth?: string) {
    const secret = this.config.get('cronSecret', { infer: true });
    if (!secret || auth !== `Bearer ${secret}`) {
      throw new ForbiddenException('Invalid cron credentials');
    }
    const result = await this.notifications.refreshAllOrgs();
    this.logger.log(`Refreshed alerts for ${result.orgs} org(s)`);
    return result;
  }
}
