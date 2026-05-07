import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminStatsService } from './admin-stats.service';

/**
 * Admin-only fleet stats for the internal dashboard at port 3001.
 * Guarded by the existing shared `ADMIN_API_TOKEN` bearer (same gate as
 * `POST /api/admin/device-claims`). Per-user admin auth (User.isAdmin) is
 * a follow-up; for v0 "knows the token" is the access boundary, and the
 * admin Next.js app reads the token from a server-side env var so it
 * never reaches the browser.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly service: AdminStatsService) {}

  @Get()
  get() {
    return this.service.getStats();
  }
}
