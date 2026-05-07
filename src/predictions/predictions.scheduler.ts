import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionsService } from './predictions.service';

/**
 * Nightly retrain orchestrator. Lives in the NestJS server (not the Python
 * sidecar) for two reasons:
 *
 *  1. `@nestjs/schedule` is already in use for the hourly weather poll —
 *     keeps cron infrastructure consolidated.
 *  2. Avoids adding APScheduler / cron daemons inside the sidecar, which
 *     would couple model training timing to the sidecar lifecycle.
 *
 * Every fired retrain is a normal HTTP call to the sidecar's
 * `/retrain/anomaly` endpoint — same code path that ops can hit manually
 * for ad-hoc fits. Failures are logged but never throw; the scheduler
 * silently retries the next night.
 */
@Injectable()
export class PredictionsScheduler {
  private readonly logger = new Logger(PredictionsScheduler.name);

  constructor(private readonly predictions: PredictionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async nightlyAnomalyRetrain() {
    this.logger.log('Nightly anomaly retrain triggered');
    const result = await this.predictions.triggerAnomalyRetrain();
    if (!result) {
      this.logger.warn(
        'Nightly anomaly retrain: sidecar unreachable or returned non-2xx; will retry tomorrow',
      );
      return;
    }
    this.logger.log(
      `Nightly anomaly retrain complete — trained=${result.trained.length} ` +
        `(${result.trained.map((t) => t.pondId).join(', ') || 'none'}), ` +
        `skipped=${result.skipped.length}`,
    );
  }
}
