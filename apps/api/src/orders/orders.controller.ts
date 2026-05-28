import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  OrderListQueryDto,
  TransitionOrderDto,
  UpdateOrderDto,
} from './dto/order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(orgId, user.sub, dto);
  }

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query() query: OrderListQueryDto) {
    return this.orders.findAll(orgId, query);
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.orders.findOne(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orders.update(orgId, user.sub, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/status')
  transition(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TransitionOrderDto,
  ) {
    return this.orders.transition(orgId, user.sub, id, dto);
  }
}
