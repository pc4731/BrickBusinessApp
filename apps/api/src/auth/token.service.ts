import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, JwtPayload } from '@brick/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AppConfig } from '../config/configuration';

interface DeviceMeta {
  deviceId?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Issues access tokens and ROTATING refresh tokens.
 * Refresh tokens are high-entropy JWTs; we store only their SHA-256 hash so a
 * DB leak can't be replayed. Each refresh revokes the old token and mints a new
 * one (rotation), enabling logout, revocation, and a device list.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueTokens(payload: JwtPayload, device: DeviceMeta = {}): Promise<AuthTokens> {
    const jwtCfg = this.config.get('jwt', { infer: true });

    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtCfg.accessSecret,
      expiresIn: jwtCfg.accessTtl,
    });
    // jti makes every refresh token unique even when issued within the same
    // second with an identical payload (otherwise the JWT — and its hash —
    // would collide on the unique tokenHash index).
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      { secret: jwtCfg.refreshSecret, expiresIn: jwtCfg.refreshTtl },
    );

    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: this.hash(refreshToken),
        deviceId: device.deviceId,
        userAgent: device.userAgent,
        ip: device.ip,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  /** Verifies + rotates a refresh token. Returns new tokens or null if invalid. */
  async rotate(refreshToken: string, device: DeviceMeta = {}): Promise<AuthTokens | null> {
    const jwtCfg = this.config.get('jwt', { infer: true });

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtCfg.refreshSecret,
      });
    } catch {
      return null;
    }

    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return null;
    }

    // Revoke the used token (rotation) before issuing a replacement.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      { sub: payload.sub, orgId: payload.orgId, role: payload.role },
      device,
    );
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
