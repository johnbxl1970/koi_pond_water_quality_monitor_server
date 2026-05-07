import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminUserGuard } from '../auth/admin-user.guard';
import { AdminListsService } from './admin-lists.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminUserGuard)
@Controller('admin')
export class AdminListsController {
  constructor(private readonly service: AdminListsService) {}

  @Get('users')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'admin', required: false, enum: ['true', 'false'] })
  users(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('admin') admin?: string,
  ) {
    return this.service.users(limit, offset, { search, admin });
  }

  @Get('ponds')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'search', required: false })
  ponds(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    return this.service.ponds(limit, offset, { search });
  }

  @Get('devices')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'search', required: false })
  devices(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    return this.service.devices(limit, offset, { search });
  }

  @Get('alerts')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: ['INFO', 'WARNING', 'CRITICAL'] })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'resolved'] })
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  alerts(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('since') since?: string,
  ) {
    return this.service.alerts(limit, offset, { severity, status, since });
  }

  @Get('predictions')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'kind', required: false, enum: ['ANOMALY_SCORE', 'DO_FORECAST', 'NH3_FORECAST'] })
  @ApiQuery({ name: 'flagged', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  predictions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('kind') kind?: string,
    @Query('flagged') flagged?: string,
    @Query('since') since?: string,
  ) {
    return this.service.predictions(limit, offset, { kind, flagged, since });
  }
}
