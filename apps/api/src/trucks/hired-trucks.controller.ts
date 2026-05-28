import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { HiredTrucksService } from './hired-trucks.service';
import { CreateHiredTruckDto, UpdateHiredTruckDto } from './dto/hired-truck.dto';

@Controller('hired-trucks')
export class HiredTrucksController {
  constructor(private readonly trucks: HiredTrucksService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateHiredTruckDto) {
    return this.trucks.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query() query: PaginationQueryDto) {
    return this.trucks.findAll(orgId, query);
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.trucks.findOne(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() dto: UpdateHiredTruckDto) {
    return this.trucks.update(orgId, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.trucks.remove(orgId, id);
  }
}
