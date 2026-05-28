import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { AuthTokens, AuthUser, JwtPayload } from '@brick/types';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

interface DeviceMeta {
  deviceId?: string;
  userAgent?: string;
  ip?: string;
}

export interface LoginResult extends AuthTokens {
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string, device: DeviceMeta): Promise<LoginResult> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
    });
    // Always compare against a hash to keep timing roughly constant.
    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinv');

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, orgId: user.orgId, role: user.role };
    const tokens = await this.tokens.issueTokens(payload, device);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        orgId: user.orgId,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
      },
    };
  }

  async refresh(refreshToken: string, device: DeviceMeta): Promise<AuthTokens> {
    const rotated = await this.tokens.rotate(refreshToken, device);
    if (!rotated) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return rotated;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      id: user.id,
      orgId: user.orgId,
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language,
    };
  }
}
