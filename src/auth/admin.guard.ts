import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { AppConfig } from '../config/config.service';

/**
 * Minimal bearer-token guard for /admin/* endpoints. This is an MVP placeholder
 * until full JWT auth lands. The admin token is a single shared secret — rotate
 * it aggressively and store it in a secret manager in production.
 *
 * An empty ADMIN_API_TOKEN env var disables admin routes entirely (fail-closed).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.adminApiToken;
    if (!expected) {
      throw new UnauthorizedException('Admin routes disabled: ADMIN_API_TOKEN not set');
    }
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const provided = header.slice('Bearer '.length);
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}
