import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { CustomersService } from './customers.service';
import {
  CreateCustomerAddressDto,
  CreateCustomerDto,
  CreateCustomerPriceDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateCustomerDto) {
    return this.customers.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query() query: PaginationQueryDto) {
    return this.customers.findAll(orgId, query);
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.customers.findOne(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(orgId, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.customers.remove(orgId, id);
  }

  // ── Addresses ──
  @Get(':id/addresses')
  listAddresses(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.customers.listAddresses(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/addresses')
  addAddress(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customers.addAddress(orgId, id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id/addresses/:addressId')
  removeAddress(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customers.removeAddress(orgId, id, addressId);
  }

  // ── Prices ──
  @Get(':id/prices')
  listPrices(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.customers.listPrices(orgId, id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/prices')
  addPrice(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerPriceDto,
  ) {
    return this.customers.addPrice(orgId, id, dto);
  }
}
