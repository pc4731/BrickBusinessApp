import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateDriverDto) {
    return this.drivers.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query() query: PaginationQueryDto) {
    return this.drivers.findAll(orgId, query);
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.drivers.findOne(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.drivers.update(orgId, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.drivers.remove(orgId, id);
  }
}
