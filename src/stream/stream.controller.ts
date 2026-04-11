import { Controller, Inject, Param, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import Redis from 'ioredis';
import { REDIS_SUB } from '../redis/redis.module';
import { STREAM_CHANNEL } from '../ingest/ingest.service';

@ApiTags('stream')
@Controller('ponds/:pondId/stream')
export class StreamController {
  constructor(@Inject(REDIS_SUB) private readonly sub: Redis) {}

  @Sse()
  stream(@Param('pondId') pondId: string): Observable<MessageEvent> {
    const channel = STREAM_CHANNEL(pondId);
    return new Observable<MessageEvent>((subscriber) => {
      // One dedicated subscriber connection per SSE stream to keep subscription
      // state isolated from other callers.
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
