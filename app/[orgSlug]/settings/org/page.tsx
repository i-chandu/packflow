import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { auth } from "@/auth";
import { canManageOrg } from "@/lib/org/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const ctx = await getOrganizationContext(orgSlug, session.user.id);

  if (!ctx) return null;

  const canEdit = canManageOrg(ctx.membership.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ctx.organization.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-zinc-500">Workspace URL:</span> /{ctx.organization.slug}
          </p>
          <p>
            <span className="text-zinc-500">Invoice prefix:</span>{" "}
            {ctx.organization.invoicePrefix}
          </p>
          <p>
            <span className="text-zinc-500">Your role:</span>{" "}
            <span className="capitalize">{ctx.membership.role}</span>
          </p>
          {!canEdit && (
            <p className="text-zinc-500">Contact an admin to change organization settings.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
