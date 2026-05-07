import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminUserGuard } from '../auth/admin-user.guard';
import { AdminStatsService } from './admin-stats.service';

/**
 * Admin-only fleet stats for the internal dashboard at port 3001.
 * Guarded by `AdminUserGuard` — requires a valid JWT bearer token from
 * a User with `isAdmin = true`. The shared `ADMIN_API_TOKEN` bearer
 * still gates `POST /api/admin/device-claims` for the flashing tool,
 * but everything human-facing is now per-user.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminUserGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get()
  get() {
    return this.service.getStats();
  }
}
