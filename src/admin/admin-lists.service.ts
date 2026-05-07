import { Injectable } from '@nestjs/common';
import { Prisma, PredictionKind, AlertSeverity } from '@prisma/client';
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

/** Translate a friendly `?since=24h|7d|30d` window into a concrete cutoff
 *  Date. Anything else (including absent) returns null = no cutoff. */
function sinceCutoff(raw: string | undefined): Date | null {
  if (!raw) return null;
  const now = Date.now();
  switch (raw) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default: return null;
  }
}

function parseBool(raw: string | undefined): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export interface ListPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface UsersFilter {
  search?: string;
  admin?: string; // "true" | "false"
}
export interface PondsFilter {
  search?: string;
}
export interface DevicesFilter {
  search?: string;
}
export interface AlertsFilter {
  severity?: string; // INFO | WARNING | CRITICAL
  status?: string;   // open | resolved
  since?: string;    // 24h | 7d | 30d
}
export interface PredictionsFilter {
  kind?: string;
  flagged?: string;  // "true" | "false"
  since?: string;
}

@Injectable()
export class AdminListsService {
  constructor(private readonly prisma: PrismaService) {}

  async users(rawLimit?: string, rawOffset?: string, filter: UsersFilter = {}) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const where: Prisma.UserWhereInput = {};
    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: 'insensitive' } },
        { displayName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const adminFlag = parseBool(filter.admin);
    if (adminFlag !== undefined) where.isAdmin = adminFlag;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          isAdmin: true,
          dataContributionConsent: true,
          _count: { select: { pondMembers: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async ponds(rawLimit?: string, rawOffset?: string, filter: PondsFilter = {}) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const where: Prisma.PondWhereInput = {};
    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      this.prisma.pond.findMany({
        where,
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
      this.prisma.pond.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async devices(rawLimit?: string, rawOffset?: string, filter: DevicesFilter = {}) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const where: Prisma.DeviceWhereInput = {};
    if (filter.search) {
      where.OR = [
        { hardwareId: { contains: filter.search, mode: 'insensitive' } },
        { label: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
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
      this.prisma.device.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async alerts(rawLimit?: string, rawOffset?: string, filter: AlertsFilter = {}) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const where: Prisma.AlertEventWhereInput = {};
    if (filter.severity && ['INFO', 'WARNING', 'CRITICAL'].includes(filter.severity)) {
      where.severity = filter.severity as AlertSeverity;
    }
    if (filter.status === 'open') where.resolvedAt = null;
    else if (filter.status === 'resolved') where.resolvedAt = { not: null };
    const since = sinceCutoff(filter.since);
    if (since) where.firedAt = { gte: since };

    const [items, total] = await Promise.all([
      this.prisma.alertEvent.findMany({
        where,
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
      this.prisma.alertEvent.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async predictions(rawLimit?: string, rawOffset?: string, filter: PredictionsFilter = {}) {
    const limit = clampLimit(rawLimit);
    const offset = clampOffset(rawOffset);
    const where: Prisma.PredictionEventWhereInput = {};
    if (filter.kind && ['ANOMALY_SCORE', 'DO_FORECAST', 'NH3_FORECAST'].includes(filter.kind)) {
      where.kind = filter.kind as PredictionKind;
    }
    const since = sinceCutoff(filter.since);
    if (since) where.predictedAt = { gte: since };

    // The flagged flag lives inside the JSON `predicted` blob — Prisma's
    // typed JSON path access supports `path` queries on Postgres. Only
    // applicable to ANOMALY_SCORE rows; harmless on the others (will
    // exclude them, which is fine since flagged isn't defined there).
    const flagged = parseBool(filter.flagged);
    if (flagged !== undefined) {
      where.predicted = { path: ['flagged'], equals: flagged };
    }

    const [items, total] = await Promise.all([
      this.prisma.predictionEvent.findMany({
        where,
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
      this.prisma.predictionEvent.count({ where }),
    ]);
    return { items, total, limit, offset };
  }
}
