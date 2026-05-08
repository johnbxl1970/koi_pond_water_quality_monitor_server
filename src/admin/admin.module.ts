import { Module } from '@nestjs/common';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminListsController } from './admin-lists.controller';
import { AdminListsService } from './admin-lists.service';
import { AdminDetailsController } from './admin-details.controller';
import { AdminDetailsService } from './admin-details.service';
import { AdminTimeseriesController } from './admin-timeseries.controller';
import { AdminTimeseriesService } from './admin-timeseries.service';
import { AdminSystemController } from './admin-system.controller';
import { AdminSystemService } from './admin-system.service';
import { VersionService } from './version.service';
import { TelemetryModule } from '../api/telemetry/telemetry.module';

@Module({
  imports: [TelemetryModule],
  controllers: [
    AdminStatsController,
    AdminListsController,
    AdminDetailsController,
    AdminTimeseriesController,
    AdminSystemController,
  ],
  providers: [
    AdminStatsService,
    AdminListsService,
    AdminDetailsService,
    AdminTimeseriesService,
    AdminSystemService,
    VersionService,
  ],
})
export class AdminModule {}
