import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PondsService } from './ponds.service';
import { CreatePondDto, UpdatePondDto } from './ponds.dto';

@ApiTags('ponds')
@Controller('ponds')
export class PondsController {
  constructor(private readonly service: PondsService) {}

  @Get() list() { return this.service.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Post() create(@Body() dto: CreatePondDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePondDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
