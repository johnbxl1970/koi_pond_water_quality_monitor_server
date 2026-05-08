import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Liveness probe. Intentionally has zero upstream dependencies — no DB,
 * no Redis, no MQTT — so a healthy 200 means "the HTTP server is up
 * and serving requests," which is the only thing a liveness check
 * should answer. Readiness (DB reachable, MQTT subscribed, etc.) is a
 * separate concern that belongs on a future /readyz.
 */
@ApiTags('health')
@Controller('healthz')
export class HealthController {
  private readonly bootedAt = Date.now();

  @Get()
  health() {
    return {
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - this.bootedAt) / 1000),
      commit: process.env.GIT_COMMIT ?? process.env.GIT_SHA ?? 'unknown',
    };
  }
}
