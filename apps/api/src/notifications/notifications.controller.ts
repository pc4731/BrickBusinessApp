import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentOrg() orgId: string) {
    return this.notifications.list(orgId);
  }

  @Get('unread-count')
  unreadCount(@CurrentOrg() orgId: string) {
    return this.notifications.unreadCount(orgId);
  }

  @Post('refresh')
  refresh(@CurrentOrg() orgId: string) {
    return this.notifications.refresh(orgId);
  }

  @Patch('read-all')
  markAllRead(@CurrentOrg() orgId: string) {
    return this.notifications.markAllRead(orgId);
  }

  @Patch(':id/read')
  markRead(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.notifications.markRead(orgId, id);
  }
}
