import { Module } from '@nestjs/common';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminListsController } from './admin-lists.controller';
import { AdminListsService } from './admin-lists.service';
import { AdminDetailsController } from './admin-details.controller';
import { AdminDetailsService } from './admin-details.service';

@Module({
  controllers: [AdminStatsController, AdminListsController, AdminDetailsController],
  providers: [AdminStatsService, AdminListsService, AdminDetailsService],
})
export class AdminModule {}
