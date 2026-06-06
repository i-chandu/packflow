import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { createInboundPayment } from "@/app/actions/payments";
import { InboundPaymentForm } from "@/components/payments/payment-form";
import { PageHeader } from "@/components/shared/page-header";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import { prisma } from "@/lib/prisma";
import {
  listOpenInvoicesForCustomer,
} from "@/lib/queries/payments";
import { listCustomers } from "@/lib/queries/customers";

export default async function NewPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ invoiceId?: string; customerId?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx || !canWriteOperations(ctx.membership.role)) notFound();

  let defaultCustomerId = sp.customerId;
  let defaultInvoiceId = sp.invoiceId;
  let defaultAmount: bigint | undefined;

  if (sp.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: sp.invoiceId, organizationId: ctx.organization.id },
    });
    if (!invoice) notFound();
    defaultCustomerId = invoice.customerId ?? undefined;
    defaultInvoiceId = invoice.id;
    defaultAmount = invoice.balanceDueCents;
  }

  const { items: customers } = await listCustomers({
    organizationId: ctx.organization.id,
    pageSize: 500,
  });

  const invoices = defaultCustomerId
    ? await listOpenInvoicesForCustomer(ctx.organization.id, defaultCustomerId)
    : [];

  const boundAction = createInboundPayment.bind(null, orgSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record payment"
        description="Record an inbound payment from a client."
      />
      <InboundPaymentForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        invoices={invoices.map((inv) => ({
          id: inv.id,
          label: inv.invoiceNumber ?? inv.id.slice(0, 8),
          balanceDueCents: inv.balanceDueCents,
        }))}
        defaultCustomerId={defaultCustomerId}
        defaultInvoiceId={defaultInvoiceId}
        defaultAmount={defaultAmount}
        action={boundAction}
      />
    </div>
  );
}
