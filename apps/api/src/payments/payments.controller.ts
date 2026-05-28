import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import {
  CreateCustomerPaymentDto,
  CreateFactoryPaymentDto,
  CreateGeneralExpenseDto,
  CreateTruckExpenseDto,
  CreateTruckPaymentDto,
} from './dto/payment.dto';

// Finance mutations are open to OWNER, MANAGER and ACCOUNTANT.
const FINANCE_ROLES = ['OWNER', 'MANAGER', 'ACCOUNTANT'] as const;

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // ── Customer payments ──
  @Roles(...FINANCE_ROLES)
  @Post('customer-payments')
  createCustomerPayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCustomerPaymentDto,
  ) {
    return this.payments.createCustomerPayment(orgId, user.sub, dto);
  }

  @Get('customer-payments')
  listCustomerPayments(
    @CurrentOrg() orgId: string,
    @Query('customerId') customerId?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.payments.listCustomerPayments(orgId, { customerId, orderId });
  }

  @Roles(...FINANCE_ROLES)
  @Delete('customer-payments/:id')
  removeCustomerPayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.payments.removeCustomerPayment(orgId, user.sub, id);
  }

  // ── Factory payments ──
  @Roles(...FINANCE_ROLES)
  @Post('factory-payments')
  createFactoryPayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFactoryPaymentDto,
  ) {
    return this.payments.createFactoryPayment(orgId, user.sub, dto);
  }

  @Get('factory-payments')
  listFactoryPayments(
    @CurrentOrg() orgId: string,
    @Query('factoryId') factoryId?: string,
    @Query('orderId') orderId?: string,
  ) {
    return this.payments.listFactoryPayments(orgId, { factoryId, orderId });
  }

  @Roles(...FINANCE_ROLES)
  @Delete('factory-payments/:id')
  removeFactoryPayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.payments.removeFactoryPayment(orgId, user.sub, id);
  }

  // ── Hired truck payments ──
  @Roles(...FINANCE_ROLES)
  @Post('truck-payments')
  createTruckPayment(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTruckPaymentDto,
  ) {
    return this.payments.createTruckPayment(orgId, user.sub, dto);
  }

  @Get('truck-payments')
  listTruckPayments(@CurrentOrg() orgId: string, @Query('hiredTruckId') hiredTruckId?: string) {
    return this.payments.listTruckPayments(orgId, { hiredTruckId });
  }

  // ── Truck expenses ──
  @Roles(...FINANCE_ROLES)
  @Post('truck-expenses')
  createTruckExpense(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTruckExpenseDto,
  ) {
    return this.payments.createTruckExpense(orgId, user.sub, dto);
  }

  @Get('truck-expenses')
  listTruckExpenses(@CurrentOrg() orgId: string, @Query('ownTruckId') ownTruckId?: string) {
    return this.payments.listTruckExpenses(orgId, { ownTruckId });
  }

  @Roles(...FINANCE_ROLES)
  @Delete('truck-expenses/:id')
  removeTruckExpense(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.payments.removeTruckExpense(orgId, user.sub, id);
  }

  // ── General expenses ──
  @Roles(...FINANCE_ROLES)
  @Post('general-expenses')
  createGeneralExpense(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGeneralExpenseDto,
  ) {
    return this.payments.createGeneralExpense(orgId, user.sub, dto);
  }

  @Get('general-expenses')
  listGeneralExpenses(@CurrentOrg() orgId: string) {
    return this.payments.listGeneralExpenses(orgId);
  }

  @Roles(...FINANCE_ROLES)
  @Delete('general-expenses/:id')
  removeGeneralExpense(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.payments.removeGeneralExpense(orgId, user.sub, id);
  }
}
