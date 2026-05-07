import { Module } from '@nestjs/common';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminListsController } from './admin-lists.controller';
import { AdminListsService } from './admin-lists.service';
import { AdminDetailsController } from './admin-details.controller';
import { AdminDetailsService } from './admin-details.service';
import { AdminTimeseriesController } from './admin-timeseries.controller';
import { AdminTimeseriesService } from './admin-timeseries.service';

@Module({
  controllers: [
    AdminStatsController,
    AdminListsController,
    AdminDetailsController,
    AdminTimeseriesController,
  ],
  providers: [
    AdminStatsService,
    AdminListsService,
    AdminDetailsService,
    AdminTimeseriesService,
  ],
})
export class AdminModule {}
