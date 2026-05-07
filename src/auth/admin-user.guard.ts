import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from './current-user.decorator';

/**
 * Per-user admin auth. Wraps `JwtAuthGuard` to ensure a valid bearer token,
 * then loads the User row and rejects if `isAdmin !== true`.
 *
 * Note: distinct from the legacy `AdminGuard` (shared `ADMIN_API_TOKEN`
 * bearer), which is still used by `POST /api/admin/device-claims` because
 * the flashing tool isn't a user. All other admin routes have moved to
 * this per-user gate.
 *
 * The DB lookup runs on every admin call. That's fine at admin-volume
 * traffic; if it ever isn't, fold `isAdmin` into the JWT payload at
 * login/refresh and check there. Kept out of the JWT for v0 so revoking
 * admin status takes effect at the next request, not the next refresh.
 */
@Injectable()
export class AdminUserGuard extends JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const ok = (await super.canActivate(ctx)) as boolean;
    if (!ok) return false;

    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    if (!req.user) throw new ForbiddenException('No authenticated user');
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true },
    });
    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
