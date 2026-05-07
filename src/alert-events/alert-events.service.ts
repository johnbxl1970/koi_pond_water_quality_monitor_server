import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertEventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(pondId: string, opts: { limit: number; onlyOpen: boolean }) {
    return this.prisma.alertEvent.findMany({
      where: {
        pondId,
        ...(opts.onlyOpen ? { resolvedAt: null } : {}),
      },
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
