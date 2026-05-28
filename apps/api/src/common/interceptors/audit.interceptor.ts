import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { JwtPayload } from '@brick/types';
import { AuditAction } from '@brick/db';
import { PrismaService } from '../../prisma/prisma.service';

const METHOD_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

interface AuditRequest {
  method: string;
  originalUrl?: string;
  url: string;
  user?: JwtPayload;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
}

/**
 * Records mutating requests (POST/PUT/PATCH/DELETE) to audit_logs on success.
 * Read requests are skipped. Failures here never break the request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuditRequest>();
    const action = METHOD_ACTION[req.method];

    if (!action || !req.user) {
      return next.handle();
    }

    const path = (req.originalUrl ?? req.url).split('?')[0] ?? '';
    const entityType = deriveEntityType(path);
    const entityId = req.params?.id;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: () => {
          void this.prisma.auditLog
            .create({
              data: {
                orgId: req.user!.orgId,
                userId: req.user!.sub,
                action,
                entityType,
                entityId,
                ip: req.ip,
                userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
              },
            })
            .catch(() => undefined);
        },
      }),
    );
  }
}

/** "/api/v1/customers/abc" → "customers". */
function deriveEntityType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  // Drop the api prefix (e.g. "api", "v1") then take the resource segment.
  const idx = segments.findIndex((s) => /^v\d+$/.test(s));
  const resource = idx >= 0 ? segments[idx + 1] : segments[0];
  return resource ?? 'unknown';
}
