import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@brick/types';

/** Injects the authenticated user's orgId — the tenant scope for every query. */
export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
  return request.user!.orgId;
});
