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
  users(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.users(limit, offset);
  }

  @Get('ponds')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  ponds(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.ponds(limit, offset);
  }

  @Get('devices')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  devices(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.devices(limit, offset);
  }

  @Get('alerts')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  alerts(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.alerts(limit, offset);
  }

  @Get('predictions')
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  predictions(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.service.predictions(limit, offset);
  }
}
