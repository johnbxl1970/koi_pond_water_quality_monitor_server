import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function clampLimit(raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function clampOffset(raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export interface ListPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class AdminListsService {
  constructor(private readonly prisma: PrismaService) {}

  async users(rawLimit?: string, rawOffset?: string) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          dataContributionConsent: true,
          _count: { select: { pondMembers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, limit, offset };
  }

  async ponds(rawLimit?: string, rawOffset?: string) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const [items, total] = await Promise.all([
      this.prisma.pond.findMany({
        select: {
          id: true,
          name: true,
          volumeM3: true,
          koiCount: true,
          latitude: true,
          longitude: true,
          timezone: true,
          createdAt: true,
          _count: { select: { devices: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.pond.count(),
    ]);
    return { items, total, limit, offset };
  }

  async devices(rawLimit?: string, rawOffset?: string) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const [items, total] = await Promise.all([
      this.prisma.device.findMany({
        select: {
          id: true,
          hardwareId: true,
          label: true,
          firmwareVer: true,
          lastSeenAt: true,
          createdAt: true,
          pondId: true,
          pond: { select: { name: true } },
          _count: { select: { certificates: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.device.count(),
    ]);
    return { items, total, limit, offset };
  }

  async alerts(rawLimit?: string, rawOffset?: string) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const [items, total] = await Promise.all([
      this.prisma.alertEvent.findMany({
        select: {
          id: true,
          pondId: true,
          metric: true,
          value: true,
          severity: true,
          firedAt: true,
          resolvedAt: true,
          pond: { select: { name: true } },
        },
        orderBy: { firedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.alertEvent.count(),
    ]);
    return { items, total, limit, offset };
  }

  async predictions(rawLimit?: string, rawOffset?: string) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const [items, total] = await Promise.all([
      this.prisma.predictionEvent.findMany({
        select: {
          id: true,
          pondId: true,
          kind: true,
          predictedAt: true,
          targetTime: true,
          predicted: true,
          modelVersionId: true,
          modelVersion: { select: { version: true } },
        },
        orderBy: { predictedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.predictionEvent.count(),
    ]);
    return { items, total, limit, offset };
  }
}
