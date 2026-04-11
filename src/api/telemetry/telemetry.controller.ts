import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PondRolesGuard } from '../../auth/pond-roles.guard';
import { PondRoles } from '../../auth/pond-roles.decorator';

const WINDOWS: Record<string, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

@ApiTags('telemetry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@PondRoles(PondRole.VIEWER)
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
