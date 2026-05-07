import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { ManualReadingsService } from './manual-readings.service';
import { CreateManualReadingDto } from './manual-readings.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PondRolesGuard } from '../../auth/pond-roles.guard';
import { PondRoles } from '../../auth/pond-roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';

@ApiTags('manual-readings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@Controller('ponds/:pondId/manual-readings')
export class ManualReadingsController {
  constructor(private readonly service: ManualReadingsService) {}

  @Post()
  @PondRoles(PondRole.TECHNICIAN)
  create(
    @Param('pondId') pondId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateManualReadingDto,
  ) {
    return this.service.create(pondId, user.id, dto);
  }

  @Get()
  @PondRoles(PondRole.VIEWER)
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(@Param('pondId') pondId: string, @Query('limit') limit = '100') {
    const n = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
    return this.service.list(pondId, n);
  }
}
