import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';

const WINDOWS: Record<string, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

@ApiTags('telemetry')
@Controller('ponds/:pondId/telemetry')
export class TelemetryController {
  constructor(private readonly service: TelemetryService) {}

  @Get()
  @ApiQuery({ name: 'window', required: false, enum: Object.keys(WINDOWS) })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  query(
    @Param('pondId') pondId: string,
    @Query('window') window = '1h',
    @Query('limit') limit = '500',
  ) {
    const ms = WINDOWS[window] ?? WINDOWS['1h'];
    const n = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 10000);
    return this.service.query(pondId, ms, n);
  }
}
