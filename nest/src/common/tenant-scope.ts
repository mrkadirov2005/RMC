import { ForbiddenException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from './current-user';

export interface TenantScope {
  centerId?: number;
  teacherId?: number;
  isGlobal: boolean;
}

const parsePositive = (value: unknown): number | undefined => {
  const out = Number(value || 0);
  return Number.isFinite(out) && out > 0 ? out : undefined;
};

export function getTenantScope(req: Request & { user?: CurrentUser }, options: { requireConcreteCenter?: boolean } = {}): TenantScope {
  const user = req.user;
  const headerCenterId = parsePositive(req.headers['x-center-id']);
  const skipCenterScope = req.headers['x-skip-center-scope'] === '1';
  const userCenterId = parsePositive(user?.center_id ?? user?.centerId);
  const queryCenterId = parsePositive((req.query || {}).center_id);
  const bodyCenterId = parsePositive((req.body || {}).center_id);

  const isGlobal = Boolean(skipCenterScope && (user?.userType === 'owner' || user?.userType === 'superuser'));
  const centerId = headerCenterId || queryCenterId || bodyCenterId || userCenterId;
  const teacherId = user?.userType === 'teacher' ? Number(user.id) : undefined;

  if (options.requireConcreteCenter && !centerId) {
    throw new BadRequestException('Center scope required.');
  }
  if (!centerId && !isGlobal) {
    throw new ForbiddenException('Center scope required.');
  }

  return { centerId, teacherId, isGlobal };
}
