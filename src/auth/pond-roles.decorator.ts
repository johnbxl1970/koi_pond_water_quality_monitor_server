import { SetMetadata } from '@nestjs/common';
import { PondRole } from '@prisma/client';

export const POND_ROLES_KEY = 'pondRoles';

/**
 * Restrict access to users who hold one of the given roles on the pond
 * identified by the route parameter `:pondId`. Role order from most to least
 * privileged: OWNER > TECHNICIAN > VIEWER. The guard admits a user whose
 * role is equal to or more privileged than any in the list.
 */
export const PondRoles = (...roles: PondRole[]) => SetMetadata(POND_ROLES_KEY, roles);
