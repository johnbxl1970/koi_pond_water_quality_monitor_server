import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { IngestModule } from './ingest/ingest.module';
import { ProvisioningModule } from './provisioning/provisioning.module';
import { PondsModule } from './api/ponds/ponds.module';
import { DevicesModule } from './api/devices/devices.module';
import { TelemetryModule } from './api/telemetry/telemetry.module';
import { StreamModule } from './stream/stream.module';
import { WeatherModule } from './weather/weather.module';
import { AlertsModule } from './alerts/alerts.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    ProvisioningModule,
    IngestModule,
    PondsModule,
    DevicesModule,
    TelemetryModule,
    StreamModule,
    WeatherModule,
    AlertsModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
