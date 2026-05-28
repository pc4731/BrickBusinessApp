import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentOrg() orgId: string) {
    return this.settings.get(orgId);
  }

  @Roles('OWNER')
  @Patch()
  update(@CurrentOrg() orgId: string, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(orgId, dto);
  }
}
