import type { OrganizationMemberRole } from "@prisma/client";

const ROLE_RANK: Record<OrganizationMemberRole, number> = {
  viewer: 0,
  staff: 1,
  admin: 2,
  owner: 3,
};

export function hasMinRole(
  role: OrganizationMemberRole,
  minimum: OrganizationMemberRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageOrg(role: OrganizationMemberRole): boolean {
  return hasMinRole(role, "admin");
}

export function canWriteOperations(role: OrganizationMemberRole): boolean {
  return hasMinRole(role, "staff");
}
