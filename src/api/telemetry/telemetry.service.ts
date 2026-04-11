import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  async query(pondId: string, windowMs: number, limit: number) {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.telemetry.findMany({
      where: { pondId, time: { gte: since } },
      orderBy: { time: 'desc' },
      take: limit,
    });
  }
}
