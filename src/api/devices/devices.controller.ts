import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto } from './devices.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../auth/current-user.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Get()
  @ApiQuery({ name: 'pondId', required: false })
  list(@CurrentUser() user: CurrentUserPayload, @Query('pondId') pondId?: string) {
    return this.service.list(user.id, pondId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.get(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateDeviceDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.remove(id, user.id);
  }
}
