import { Injectable } from '@nestjs/common';
import { AlertSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

export interface ListOpts {
  limit: number;
  onlyOpen: boolean;
  severity?: string;
  since?: string;
}

@Injectable()
export class AlertEventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(pondId: string, opts: ListOpts) {
    const where: Prisma.AlertEventWhereInput = { pondId };
    if (opts.onlyOpen) where.resolvedAt = null;
    if (opts.severity && ['INFO', 'WARNING', 'CRITICAL'].includes(opts.severity)) {
      where.severity = opts.severity as AlertSeverity;
    }
    const since = sinceCutoff(opts.since);
    if (since) where.firedAt = { gte: since };
    return this.prisma.alertEvent.findMany({
      where,
      orderBy: { firedAt: 'desc' },
      take: opts.limit,
      include: {
        rule: {
          select: { id: true, metric: true, op: true, threshold: true, severity: true },
        },
      },
    });
  }
}
