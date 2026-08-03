import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public — bypasses JWT authentication guard.
 * @example @Public() @Get('/health')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
