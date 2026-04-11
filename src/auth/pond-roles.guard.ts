import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PondRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { POND_ROLES_KEY } from './pond-roles.decorator';
import { CurrentUserPayload } from './current-user.decorator';

const RANK: Record<PondRole, number> = {
  VIEWER: 0,
  TECHNICIAN: 1,
  OWNER: 2,
};

/**
 * Checks that the authenticated user holds (at least) one of the declared
 * roles on the pond identified by the route parameter `:pondId`. Apply
 * alongside `JwtAuthGuard` — this guard assumes `req.user` is already set.
 *
 * If a controller route doesn't have `:pondId`, this guard is a no-op.
 */
@Injectable()
export class PondRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PondRole[] | undefined>(
      POND_ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<{
      user?: CurrentUserPayload;
      params: Record<string, string>;
    }>();
    if (!req.user) throw new ForbiddenException('No authenticated user');
    const pondId = req.params.pondId;
    if (!pondId) return true; // no pond context on this route

    const membership = await this.prisma.pondMember.findUnique({
      where: { pondId_userId: { pondId, userId: req.user.id } },
    });
    if (!membership) {
      // Hide existence from non-members.
      throw new NotFoundException(`Pond ${pondId} not found`);
    }

    const userRank = RANK[membership.role];
    const minRequiredRank = Math.min(...required.map((r) => RANK[r]));
    if (userRank < minRequiredRank) {
      throw new ForbiddenException(
        `Requires pond role ${required.join(' or ')}; you have ${membership.role}`,
      );
    }
    return true;
  }
}
