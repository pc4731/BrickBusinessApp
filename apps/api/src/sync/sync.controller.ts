import { Body, Controller, Post } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  // Offline order entry + payment recording flush here. Same roles as the
  // underlying create operations.
  @Roles('OWNER', 'MANAGER', 'ACCOUNTANT')
  @Post()
  process(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SyncRequestDto,
  ) {
    return this.sync.process(orgId, user.sub, dto);
  }
}
