import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto } from './devices.dto';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Get()
  @ApiQuery({ name: 'pondId', required: false })
  list(@Query('pondId') pondId?: string) { return this.service.list(pondId); }

  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Post() create(@Body() dto: CreateDeviceDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
