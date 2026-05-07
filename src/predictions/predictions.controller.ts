import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { PredictionsService } from './predictions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PondRolesGuard } from '../auth/pond-roles.guard';
import { PondRoles } from '../auth/pond-roles.decorator';

@ApiTags('predictions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@PondRoles(PondRole.VIEWER)
@Controller('ponds/:pondId/predictions')
export class PredictionsController {
  constructor(private readonly service: PredictionsService) {}

  /** Current state — calls the ML sidecar for fresh inference. */
  @Get()
  get(@Param('pondId') pondId: string) {
    return this.service.getPredictions(pondId);
  }

  /**
   * History of recorded predictions for this pond. Reads from the
   * PredictionEvent table; doesn't touch the sidecar. Filterable by kind,
   * flagged, and since.
   */
  @Get('history')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'kind', required: false, enum: ['ANOMALY_SCORE', 'DO_FORECAST', 'NH3_FORECAST'] })
  @ApiQuery({ name: 'flagged', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  history(
    @Param('pondId') pondId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('kind') kind?: string,
    @Query('flagged') flagged?: string,
    @Query('since') since?: string,
  ) {
    return this.service.getHistory(pondId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      kind,
      flagged,
      since,
    });
  }
}
