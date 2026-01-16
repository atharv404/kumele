import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark endpoints as public (no authentication required)
 * Use this decorator on controller methods that should be accessible without JWT
 *
 * @example
 * @Public()
 * @Get('public-endpoint')
 * async publicEndpoint() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
