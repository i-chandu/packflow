import type { Organization, OrganizationMember } from "@prisma/client";

export type OrganizationContext = {
  organization: Organization;
  membership: OrganizationMember;
};
