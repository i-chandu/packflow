import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { createSupplierBill } from "@/app/actions/supplier-bills";
import { SupplierBillForm } from "@/components/supplier-bills/supplier-bill-form";
import { PageHeader } from "@/components/shared/page-header";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import { listSuppliers } from "@/lib/queries/suppliers";

export default async function NewSupplierBillPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx || !canWriteOperations(ctx.membership.role)) notFound();

  const { items: suppliers } = await listSuppliers({
    organizationId: ctx.organization.id,
    pageSize: 500,
  });

  const boundAction = createSupplierBill.bind(null, orgSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New supplier bill"
        description="Record a payable bill from a supplier."
      />
      <SupplierBillForm
        suppliers={suppliers}
        defaultSupplierId={sp.supplierId}
        action={boundAction}
        submitLabel="Create bill"
      />
    </div>
  );
}
