import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { OwnTrucksService } from './own-trucks.service';
import { CreateOwnTruckDto, UpdateOwnTruckDto } from './dto/own-truck.dto';

@Controller('own-trucks')
export class OwnTrucksController {
  constructor(private readonly trucks: OwnTrucksService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateOwnTruckDto) {
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
  update(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() dto: UpdateOwnTruckDto) {
    return this.trucks.update(orgId, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.trucks.remove(orgId, id);
  }
}
