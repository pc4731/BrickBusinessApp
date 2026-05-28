import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { StockService } from './stock.service';
import { CreateStockBatchDto, StockQueryDto } from './dto/stock.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('summary')
  summary(@CurrentOrg() orgId: string) {
    return this.stock.summary(orgId);
  }

  @Roles('OWNER', 'MANAGER')
  @Post('batches')
  createBatch(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStockBatchDto,
  ) {
    return this.stock.createBatch(orgId, user.sub, dto);
  }

  @Get('batches')
  findAll(@CurrentOrg() orgId: string, @Query() query: StockQueryDto) {
    return this.stock.findAll(orgId, query);
  }

  @Get('batches/:id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.stock.findOne(orgId, id);
  }
}
