import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateInvoiceDraft, issueInvoice } from "@/app/actions/invoices";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import {
  getInvoiceById,
  listCustomersForInvoiceSelect,
  listProductsForInvoiceSelect,
} from "@/lib/queries/invoices";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/invoices/${id}`);

  const invoice = await getInvoiceById(ctx.organization.id, id);
  if (!invoice) notFound();
  if (invoice.status !== "draft") redirect(`/${orgSlug}/invoices/${id}`);

  const [customers, products] = await Promise.all([
    listCustomersForInvoiceSelect(ctx.organization.id),
    listProductsForInvoiceSelect(ctx.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit draft" description="Update lines and issue when ready." />
      <InvoiceBuilder
        orgSlug={orgSlug}
        customers={customers}
        products={products}
        invoice={{ ...invoice, lines: invoice.lines }}
        saveAction={updateInvoiceDraft.bind(null, orgSlug, id)}
        issueAction={issueInvoice.bind(null, orgSlug, id)}
      />
    </div>
  );
}
