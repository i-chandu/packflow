import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { createOutboundPayment } from "@/app/actions/payments";
import { OutboundPaymentForm } from "@/components/payments/payment-form";
import { PageHeader } from "@/components/shared/page-header";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import { prisma } from "@/lib/prisma";
import { listOpenBillsForSupplier } from "@/lib/queries/payments";
import { listSuppliers } from "@/lib/queries/suppliers";

export default async function NewSupplierPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ supplierId?: string; supplierBillId?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx || !canWriteOperations(ctx.membership.role)) notFound();

  let defaultSupplierId = sp.supplierId;
  let defaultBillId = sp.supplierBillId;
  let defaultAmount: bigint | undefined;

  if (sp.supplierBillId) {
    const bill = await prisma.supplierBill.findFirst({
      where: { id: sp.supplierBillId, organizationId: ctx.organization.id },
    });
    if (!bill) notFound();
    defaultSupplierId = bill.supplierId;
    defaultBillId = bill.id;
    defaultAmount = bill.balanceDueCents;
  }

  const { items: suppliers } = await listSuppliers({
    organizationId: ctx.organization.id,
    pageSize: 500,
  });

  const bills = defaultSupplierId
    ? await listOpenBillsForSupplier(ctx.organization.id, defaultSupplierId)
    : [];

  const boundAction = createOutboundPayment.bind(null, orgSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay supplier"
        description="Record an outbound payment to a supplier."
      />
      <OutboundPaymentForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        bills={bills.map((bill) => ({
          id: bill.id,
          label: bill.billNumber,
          balanceDueCents: bill.balanceDueCents,
        }))}
        defaultSupplierId={defaultSupplierId}
        defaultBillId={defaultBillId}
        defaultAmount={defaultAmount}
        action={boundAction}
      />
    </div>
  );
}
