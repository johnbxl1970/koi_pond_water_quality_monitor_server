import { Module } from '@nestjs/common';
import { AlertEventsController } from './alert-events.controller';
import { AlertEventsService } from './alert-events.service';

@Module({
  controllers: [AlertEventsController],
  providers: [AlertEventsService],
})
export class AlertEventsModule {}
