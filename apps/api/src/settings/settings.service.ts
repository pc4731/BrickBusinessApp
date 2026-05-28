import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_ORG_SETTINGS, type OrgSettings } from '@brick/types';
import type { Prisma } from '@brick/db';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    const { settings, ...business } = org;
    return {
      ...business,
      // Defaults fill any keys a stored settings blob is missing.
      settings: { ...DEFAULT_ORG_SETTINGS, ...((settings as Partial<OrgSettings>) ?? {}) },
    };
  }

  async update(orgId: string, dto: UpdateSettingsDto) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const { settings: settingsPatch, ...business } = dto;
    const mergedSettings = settingsPatch
      ? { ...DEFAULT_ORG_SETTINGS, ...((org.settings as Partial<OrgSettings>) ?? {}), ...settingsPatch }
      : undefined;

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...business,
        // Settings is a JSON column; the validated DTO is a safe JSON value.
        ...(mergedSettings ? { settings: mergedSettings as unknown as Prisma.InputJsonValue } : {}),
      },
    });
    return this.get(orgId);
  }
}
