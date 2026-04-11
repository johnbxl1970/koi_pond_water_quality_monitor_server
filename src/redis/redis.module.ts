import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/config.service';

export const REDIS_PUB = 'REDIS_PUB';
export const REDIS_SUB = 'REDIS_SUB';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_PUB,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new Redis(config.redisUrl),
    },
    {
      provide: REDIS_SUB,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new Redis(config.redisUrl),
    },
  ],
  exports: [REDIS_PUB, REDIS_SUB],
})
export class RedisModule {}
