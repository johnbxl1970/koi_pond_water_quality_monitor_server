import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminUserGuard } from '../auth/admin-user.guard';
import { AdminDetailsService } from './admin-details.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminUserGuard)
@Controller('admin')
export class AdminDetailsController {
  constructor(private readonly service: AdminDetailsService) {}

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.service.user(id);
  }

  @Get('ponds/:id')
  pond(@Param('id') id: string) {
    return this.service.pond(id);
  }

  @Get('devices/:id')
  device(@Param('id') id: string) {
    return this.service.device(id);
  }

  @Get('alerts/:id')
  alert(@Param('id') id: string) {
    return this.service.alert(id);
  }

  @Get('predictions/:id')
  prediction(@Param('id') id: string) {
    return this.service.prediction(id);
  }
}
