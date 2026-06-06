import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { updateSupplierBill } from "@/app/actions/supplier-bills";
import { SupplierBillForm } from "@/components/supplier-bills/supplier-bill-form";
import { PageHeader } from "@/components/shared/page-header";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import { getSupplierBillById } from "@/lib/queries/supplier-bills";
import { listSuppliers } from "@/lib/queries/suppliers";

export default async function EditSupplierBillPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx || !canWriteOperations(ctx.membership.role)) notFound();

  const bill = await getSupplierBillById(ctx.organization.id, id);
  if (!bill) notFound();
  if (
    bill.status === "void" ||
    bill.allocations.length > 0 ||
    bill.amountPaidCents > BigInt(0)
  ) {
    notFound();
  }

  const { items: suppliers } = await listSuppliers({
    organizationId: ctx.organization.id,
    pageSize: 500,
  });

  const boundAction = updateSupplierBill.bind(null, orgSlug, id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${bill.billNumber}`} />
      <SupplierBillForm
        suppliers={suppliers}
        bill={bill}
        action={boundAction}
        submitLabel="Save changes"
      />
    </div>
  );
}
