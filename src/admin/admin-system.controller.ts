import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminUserGuard } from '../auth/admin-user.guard';
import { AdminSystemService } from './admin-system.service';
import { VersionService } from './version.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminUserGuard)
@Controller('admin')
export class AdminSystemController {
  constructor(
    private readonly system: AdminSystemService,
    private readonly version: VersionService,
  ) {}

  @Get('system')
  getSystem() {
    return this.system.getStats();
  }

  @Get('version')
  getVersion() {
    return this.version.get();
  }
}
