import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { FactoriesService } from './factories.service';
import { CreateFactoryDto, CreateFactoryPriceDto, UpdateFactoryDto } from './dto/factory.dto';

@Controller('factories')
export class FactoriesController {
  constructor(private readonly factories: FactoriesService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateFactoryDto) {
    return this.factories.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query() query: PaginationQueryDto) {
    return this.factories.findAll(orgId, query);
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.factories.findOne(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() dto: UpdateFactoryDto) {
    return this.factories.update(orgId, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.factories.remove(orgId, id);
  }

  @Get(':id/prices')
  listPrices(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.factories.listPrices(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/prices')
  addPrice(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() dto: CreateFactoryPriceDto) {
    return this.factories.addPrice(orgId, id, dto);
  }
}
