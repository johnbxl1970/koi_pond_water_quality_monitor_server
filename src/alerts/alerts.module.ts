import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { FcmService } from './fcm.service';

@Module({
  providers: [AlertsService, FcmService],
  exports: [AlertsService],
})
export class AlertsModule {}
