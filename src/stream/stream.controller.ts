import { Controller, Inject, Param, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PondRole } from '@prisma/client';
import { Observable } from 'rxjs';
import Redis from 'ioredis';
import { REDIS_SUB } from '../redis/redis.module';
import { STREAM_CHANNEL } from '../ingest/ingest.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PondRolesGuard } from '../auth/pond-roles.guard';
import { PondRoles } from '../auth/pond-roles.decorator';

@ApiTags('stream')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PondRolesGuard)
@PondRoles(PondRole.VIEWER)
@Controller('ponds/:pondId/stream')
export class StreamController {
  constructor(@Inject(REDIS_SUB) private readonly sub: Redis) {}

  @Sse()
  stream(@Param('pondId') pondId: string): Observable<MessageEvent> {
    const channel = STREAM_CHANNEL(pondId);
    return new Observable<MessageEvent>((subscriber) => {
      const conn = this.sub.duplicate();
      conn.subscribe(channel).catch((err) => subscriber.error(err));
      conn.on('message', (ch, msg) => {
        if (ch === channel) subscriber.next({ data: msg });
      });
      conn.on('error', (err) => subscriber.error(err));

      return () => {
        conn.unsubscribe(channel).catch(() => undefined);
        conn.quit().catch(() => undefined);
      };
    });
  }
}
