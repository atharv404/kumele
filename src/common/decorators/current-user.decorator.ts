import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * Decorator to extract the current authenticated user from the request
 * Can optionally extract a specific property from the user object
 *
 * @example
 * // Get full user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) { ... }
 *
 * // Get specific property
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
