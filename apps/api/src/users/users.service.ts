import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';

import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

// Never leak the password hash.
const safeSelect = {
  id: true,
  orgId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  language: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.create({
        data: {
          orgId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          role: dto.role,
          language: dto.language ?? 'EN',
          passwordHash,
        },
        select: safeSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw e;
    }
  }

  findAll(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: safeSelect,
    });
  }

  async findOne(orgId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, orgId, deletedAt: null },
      select: safeSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(orgId: string, actingUserId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(orgId, id);
    // An owner must not lock themselves out by self-deactivating or self-demoting.
    if (id === actingUserId) {
      if (dto.isActive === false) throw new ForbiddenException('You cannot deactivate yourself');
      if (dto.role && dto.role !== 'OWNER') {
        throw new ForbiddenException('You cannot change your own role');
      }
    }
    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      phone: dto.phone,
      role: dto.role,
      language: dto.language,
      isActive: dto.isActive,
    };
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({ where: { id }, data, select: safeSelect });
  }

  async remove(orgId: string, actingUserId: string, id: string) {
    if (id === actingUserId) throw new ForbiddenException('You cannot delete yourself');
    await this.findOne(orgId, id);
    // Revoke sessions and soft-delete.
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: safeSelect,
    });
  }
}
