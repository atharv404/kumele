import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for accessing an endpoint
 * Use with RolesGuard to enforce role-based access control
 *
 * @example
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * async adminEndpoint() { ... }
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 * @Get('staff-only')
 * async staffEndpoint() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
