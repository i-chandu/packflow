import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import type { OrganizationContext } from "@/lib/org/types";
import type { Session } from "next-auth";

export type ActionContext = {
  session: Session;
  userId: string;
  ctx: OrganizationContext;
};

export async function requireOrgAction(orgSlug: string): Promise<ActionContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) {
    throw new Error("Organization not found");
  }

  return { session, userId: session.user.id, ctx };
}

export async function requireWriteAction(orgSlug: string): Promise<ActionContext> {
  const result = await requireOrgAction(orgSlug);
  if (!canWriteOperations(result.ctx.membership.role)) {
    throw new Error("Forbidden");
  }
  return result;
}
