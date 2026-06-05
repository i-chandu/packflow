import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { createSupplierFormAction } from "@/app/actions/suppliers";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function NewSupplierPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/suppliers`);

  return (
    <div className="space-y-6">
      <PageHeader title="New supplier" description="Add a manufacturer." />
      <SupplierForm
        orgSlug={orgSlug}
        action={createSupplierFormAction.bind(null, orgSlug)}
        submitLabel="Create supplier"
      />
    </div>
  );
}
