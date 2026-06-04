import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/org/types";

export const getOrganizationContext = cache(
  async (
    orgSlug: string,
    userId: string,
  ): Promise<OrganizationContext | null> => {
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        members: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!organization || organization.members.length === 0) {
      return null;
    }

    const { members, ...org } = organization;

    return {
      organization: org,
      membership: members[0],
    };
  },
);

export async function listUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: { some: { userId } },
    },
    orderBy: { name: "asc" },
    include: {
      members: {
        where: { userId },
        take: 1,
      },
    },
  });
}
