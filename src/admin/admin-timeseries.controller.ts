import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminUserGuard } from '../auth/admin-user.guard';
import { AdminTimeseriesService } from './admin-timeseries.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminUserGuard)
@Controller('admin/timeseries')
export class AdminTimeseriesController {
  constructor(private readonly service: AdminTimeseriesService) {}

  @Get('telemetry')
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  telemetry(@Query('since') since?: string) {
    return this.service.telemetryByDay(since);
  }

  @Get('alerts')
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  alerts(@Query('since') since?: string) {
    return this.service.alertsByDay(since);
  }

  @Get('predictions')
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  predictions(@Query('since') since?: string) {
    return this.service.predictionsByDay(since);
  }

  @Get('ponds/:id/telemetry')
  @ApiQuery({ name: 'metric', required: true })
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  pondTelemetry(
    @Param('id') id: string,
    @Query('metric') metric: string,
    @Query('since') since?: string,
  ) {
    return this.service.pondTelemetrySeries(id, metric, since);
  }
}
