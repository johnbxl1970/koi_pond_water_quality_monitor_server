import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PondRolesGuard } from '../auth/pond-roles.guard';
import { PondRoles } from '../auth/pond-roles.decorator';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@PondRoles(PondRole.VIEWER)
@Controller('ponds/:pondId/recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  get(@Param('pondId') pondId: string) {
    return this.service.forPond(pondId);
  }
}
