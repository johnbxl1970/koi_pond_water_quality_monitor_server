import { Controller, DefaultValuePipe, Get, Param, ParseBoolPipe, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { AlertEventsService } from './alert-events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PondRolesGuard } from '../auth/pond-roles.guard';
import { PondRoles } from '../auth/pond-roles.decorator';

@ApiTags('alert-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@PondRoles(PondRole.VIEWER)
@Controller('ponds/:pondId/alerts')
export class AlertEventsController {
  constructor(private readonly service: AlertEventsService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '1-200, default 50' })
  @ApiQuery({ name: 'onlyOpen', required: false, type: Boolean })
  @ApiQuery({ name: 'severity', required: false, enum: ['INFO', 'WARNING', 'CRITICAL'] })
  @ApiQuery({ name: 'since', required: false, enum: ['24h', '7d', '30d'] })
  list(
    @Param('pondId') pondId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('onlyOpen', new DefaultValuePipe(false), ParseBoolPipe) onlyOpen: boolean,
    @Query('severity') severity?: string,
    @Query('since') since?: string,
  ) {
    const clamped = Math.max(1, Math.min(limit, 200));
    return this.service.list(pondId, { limit: clamped, onlyOpen, severity, since });
  }
}
