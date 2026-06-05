import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function toAuditJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)),
  ) as Prisma.InputJsonValue;
}

export async function logAudit(params: {
  organizationId: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await prisma.auditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeData: toAuditJson(params.beforeData),
      afterData: toAuditJson(params.afterData),
    },
  });
}
