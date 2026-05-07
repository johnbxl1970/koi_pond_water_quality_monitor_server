import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeFreeNh3 } from './free-nh3';
import { PredictionsService } from '../predictions/predictions.service';

export interface Recommendation {
  level: 'ok' | 'watch' | 'action' | 'critical' | 'forecast';
  metric: string;
  message: string;
  value?: number;
  /** Hours into the future this recommendation references; absent for current-state. */
  horizonHours?: number;
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly predictions: PredictionsService,
  ) {}

  async forPond(pondId: string): Promise<Recommendation[]> {
    const pond = await this.prisma.pond.findUnique({ where: { id: pondId } });
    if (!pond) throw new NotFoundException(`Pond ${pondId} not found`);

    const latest = await this.prisma.telemetry.findFirst({
      where: { pondId },
      orderBy: { time: 'desc' },
    });
    if (!latest) return [{ level: 'watch', metric: 'telemetry', message: 'No telemetry yet.' }];

    const recs: Recommendation[] = [];

    // --- Rule-based current-state recommendations (always run) ----------

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

    // --- Predictive recommendations (additive; sidecar may be down) -----

    const preds = await this.predictions.getPredictions(pondId);

    if (preds.anomaly && preds.anomaly.available && preds.anomaly.flagged) {
      const metrics = preds.anomaly.flaggedMetrics.join(', ');
      recs.push({
        level: 'watch',
        metric: 'anomaly',
        value: preds.anomaly.score,
        message:
          `Sensor / pond-state anomaly detected (score ${preds.anomaly.score.toFixed(2)}` +
          (metrics ? `, affecting ${metrics}` : '') +
          '). Inspect probes for drift, check biofilter, compare against a manual test reading.',
      });
    }

    const doMin = minForecastValue(preds.doForecast);
    if (doMin && doMin.value < 6) {
      recs.push({
        level: 'forecast',
        metric: 'doMgL',
        value: doMin.value,
        horizonHours: doMin.hoursAhead,
        message:
          `Predicted dissolved oxygen drops to ${doMin.value.toFixed(1)} mg/L in ` +
          `~${doMin.hoursAhead}h. Pre-emptive aeration recommended.`,
      });
    }

    const nh3Max = maxForecastValue(preds.nh3Forecast);
    if (nh3Max && nh3Max.value >= 0.5) {
      recs.push({
        level: 'forecast',
        metric: 'nh3TotalPpm',
        value: nh3Max.value,
        horizonHours: nh3Max.hoursAhead,
        message:
          `Predicted total ammonia rises to ${nh3Max.value.toFixed(2)} ppm in ` +
          `~${nh3Max.hoursAhead}h. Reduce feeding and verify biofilter is healthy.`,
      });
    }

    if (recs.length === 0) {
      recs.push({ level: 'ok', metric: 'overall', message: 'All monitored parameters within safe ranges.' });
    }
    return recs;
  }
}

function minForecastValue(
  f: Awaited<ReturnType<PredictionsService['getPredictions']>>['doForecast'],
): { value: number; hoursAhead: number } | null {
  if (!f || !f.available || f.points.length === 0) return null;
  let best = f.points[0];
  for (const p of f.points) if (p.value < best.value) best = p;
  const hoursAhead = Math.max(
    1,
    Math.round((new Date(best.time).getTime() - Date.now()) / 3_600_000),
  );
  return { value: best.value, hoursAhead };
}

function maxForecastValue(
  f: Awaited<ReturnType<PredictionsService['getPredictions']>>['nh3Forecast'],
): { value: number; hoursAhead: number } | null {
  if (!f || !f.available || f.points.length === 0) return null;
  let best = f.points[0];
  for (const p of f.points) if (p.value > best.value) best = p;
  const hoursAhead = Math.max(
    1,
    Math.round((new Date(best.time).getTime() - Date.now()) / 3_600_000),
  );
  return { value: best.value, hoursAhead };
}
