import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { ForecastService } from './forecast.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PondRolesGuard } from '../auth/pond-roles.guard';
import { PondRoles } from '../auth/pond-roles.decorator';

@ApiTags('forecast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@PondRoles(PondRole.VIEWER)
@Controller('ponds/:pondId/forecast')
export class ForecastController {
  constructor(private readonly service: ForecastService) {}

  @Get()
  @ApiQuery({ name: 'hours', required: false, type: Number, description: '1-168, default 24' })
  upcoming(
    @Param('pondId') pondId: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ) {
    const clamped = Math.max(1, Math.min(hours, 168));
    return this.service.upcoming(pondId, clamped);
  }
}
