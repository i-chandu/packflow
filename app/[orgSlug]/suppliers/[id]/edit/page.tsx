import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateSupplierFormAction } from "@/app/actions/suppliers";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getSupplierById } from "@/lib/queries/suppliers";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/suppliers/${id}`);

  const supplier = await getSupplierById(ctx.organization.id, id);
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit supplier" description={supplier.name} />
      <SupplierForm
        orgSlug={orgSlug}
        supplier={supplier}
        action={updateSupplierFormAction.bind(null, orgSlug, id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
