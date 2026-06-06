import { auth } from "@/auth";
import { updateOrganization } from "@/app/actions/organization";
import { OrgSettingsForm } from "@/components/settings/org-form";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canManageOrg } from "@/lib/org/permissions";

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
  const boundAction = updateOrganization.bind(null, orgSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Workspace URL: /{ctx.organization.slug} · Role:{" "}
          <span className="capitalize">{ctx.membership.role}</span>
        </p>
      </div>

      {canEdit ? (
        <OrgSettingsForm organization={ctx.organization} action={boundAction} />
      ) : (
        <p className="text-sm text-zinc-500">
          Contact an admin to change organization settings.
        </p>
      )}
    </div>
  );
}
