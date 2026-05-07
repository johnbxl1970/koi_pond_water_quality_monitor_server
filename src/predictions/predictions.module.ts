import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { PredictionsScheduler } from './predictions.scheduler';

@Module({
  controllers: [PredictionsController],
  providers: [PredictionsService, PredictionsScheduler],
  exports: [PredictionsService],
})
export class PredictionsModule {}
