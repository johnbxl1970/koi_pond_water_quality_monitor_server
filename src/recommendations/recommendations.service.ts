import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeFreeNh3 } from './free-nh3';

export interface Recommendation {
  level: 'ok' | 'watch' | 'action' | 'critical';
  metric: string;
  message: string;
  value?: number;
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forPond(pondId: string): Promise<Recommendation[]> {
    const pond = await this.prisma.pond.findUnique({ where: { id: pondId } });
    if (!pond) throw new NotFoundException(`Pond ${pondId} not found`);

    const latest = await this.prisma.telemetry.findFirst({
      where: { pondId },
      orderBy: { time: 'desc' },
    });
    if (!latest) return [{ level: 'watch', metric: 'telemetry', message: 'No telemetry yet.' }];

    const recs: Recommendation[] = [];

    if (latest.phVal != null && latest.tempC != null && latest.nh3TotalPpm != null) {
      const freeNh3 = computeFreeNh3(latest.nh3TotalPpm, latest.phVal, latest.tempC);
      const stockingFactor = Math.max(1, pond.koiCount / Math.max(pond.volumeM3, 1));
      if (freeNh3 >= 0.05) {
        recs.push({
          level: freeNh3 >= 0.1 ? 'critical' : 'action',
          metric: 'nh3FreePpm',
          value: freeNh3,
          message:
            `Free NH3 is ${freeNh3.toFixed(3)} ppm at pH ${latest.phVal.toFixed(2)} / ` +
            `${latest.tempC.toFixed(1)}°C — toxic threshold is ~0.05 ppm. ` +
            `Stocking ${pond.koiCount} koi in ${pond.volumeM3} m³ (${stockingFactor.toFixed(2)} fish/m³). ` +
            `Reduce feeding, check biofilter, and consider a partial water change.`,
        });
      }
    }

    if (latest.doMgL != null && latest.doMgL < 6) {
      recs.push({
        level: latest.doMgL < 4 ? 'critical' : 'action',
        metric: 'doMgL',
        value: latest.doMgL,
        message: `Dissolved oxygen is ${latest.doMgL.toFixed(1)} mg/L — add aeration.`,
      });
    }

    if (latest.phVal != null && (latest.phVal < 6.8 || latest.phVal > 8.6)) {
      recs.push({
        level: 'action',
        metric: 'phVal',
        value: latest.phVal,
        message: `pH ${latest.phVal.toFixed(2)} is outside the 6.8–8.6 safe band for koi.`,
      });
    }

    if (recs.length === 0) {
      recs.push({ level: 'ok', metric: 'overall', message: 'All monitored parameters within safe ranges.' });
    }
    return recs;
  }
}
