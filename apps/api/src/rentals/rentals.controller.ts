import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { RentalsService } from './rentals.service';
import {
  CreateRentalPaymentDto,
  CreateTruckRentalDto,
  UpdateRentalStatusDto,
} from './dto/rental.dto';

// Rentals post journal entries, so mutations follow the finance roles.
const FINANCE_ROLES = ['OWNER', 'MANAGER', 'ACCOUNTANT'] as const;

@Controller('truck-rentals')
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @Roles(...FINANCE_ROLES)
  @Post()
  create(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTruckRentalDto,
  ) {
    return this.rentals.create(orgId, user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentOrg() orgId: string,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: string,
    @Query('ownTruckId') ownTruckId?: string,
  ) {
    return this.rentals.findAll(orgId, query, { status, ownTruckId });
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.rentals.findOne(orgId, id);
  }

  @Roles(...FINANCE_ROLES)
  @Patch(':id/status')
  updateStatus(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRentalStatusDto,
  ) {
    return this.rentals.updateStatus(orgId, id, user.sub, dto);
  }

  @Roles(...FINANCE_ROLES)
  @Delete(':id')
  remove(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.rentals.remove(orgId, user.sub, id);
  }

  // ── Rent payments ──
  @Get(':id/payments')
  listPayments(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.rentals.listPayments(orgId, id);
  }

  @Roles(...FINANCE_ROLES)
  @Post(':id/payments')
  recordPayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateRentalPaymentDto,
  ) {
    return this.rentals.recordPayment(orgId, user.sub, id, dto);
  }

  @Roles(...FINANCE_ROLES)
  @Delete('payments/:paymentId')
  removePayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('paymentId') paymentId: string,
  ) {
    return this.rentals.removePayment(orgId, user.sub, paymentId);
  }
}
