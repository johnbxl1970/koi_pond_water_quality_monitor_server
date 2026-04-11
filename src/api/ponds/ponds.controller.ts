import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PondsService } from './ponds.service';
import { CreatePondDto, UpdatePondDto } from './ponds.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';

@ApiTags('ponds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ponds')
export class PondsController {
  constructor(private readonly service: PondsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listForUser(user.id);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.get(id, user.id);
  }

  @Post()
  create(@Body() dto: CreatePondDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePondDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(id, user.id);
  }
}
