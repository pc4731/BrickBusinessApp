import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

// User management is owner-only.
@Roles('OWNER')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentOrg() orgId: string, @Body() dto: CreateUserDto) {
    return this.users.create(orgId, dto);
  }

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.users.findAll(orgId);
  }

  @Get(':id')
  findOne(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.users.findOne(orgId, id);
  }

  @Patch(':id')
  update(
    @CurrentOrg() orgId: string,
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(orgId, actor.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentOrg() orgId: string, @CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.users.remove(orgId, actor.sub, id);
  }
}
