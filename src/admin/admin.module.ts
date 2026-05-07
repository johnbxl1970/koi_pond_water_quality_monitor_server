import { Module } from '@nestjs/common';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminListsController } from './admin-lists.controller';
import { AdminListsService } from './admin-lists.service';

@Module({
  controllers: [AdminStatsController, AdminListsController],
  providers: [AdminStatsService, AdminListsService],
})
export class AdminModule {}
