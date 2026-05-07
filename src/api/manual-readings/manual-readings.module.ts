import { Module } from '@nestjs/common';
import { AlertsModule } from '../../alerts/alerts.module';
import { ManualReadingsController } from './manual-readings.controller';
import { ManualReadingsService } from './manual-readings.service';

@Module({
  imports: [AlertsModule],
  controllers: [ManualReadingsController],
  providers: [ManualReadingsService],
})
export class ManualReadingsModule {}
