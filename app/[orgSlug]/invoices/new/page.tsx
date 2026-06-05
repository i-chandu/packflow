import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  createInvoiceDraft,
  createAndIssueInvoice,
} from "@/app/actions/invoices";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import {
  listCustomersForInvoiceSelect,
  listProductsForInvoiceSelect,
} from "@/lib/queries/invoices";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceBuilder } from "@/components/invoices/invoice-builder";

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/invoices`);

  const [customers, products] = await Promise.all([
    listCustomersForInvoiceSelect(ctx.organization.id),
    listProductsForInvoiceSelect(ctx.organization.id),
  ]);

  const preselectedCustomer = sp.customerId
    ? { customerId: sp.customerId, lines: undefined }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New invoice"
        description="Add client, products, and issue when ready."
      />
      <InvoiceBuilder
        orgSlug={orgSlug}
        customers={customers}
        products={products}
        invoice={
          preselectedCustomer
            ? {
                id: "",
                customerId: preselectedCustomer.customerId,
                invoiceDate: null,
                dueDate: null,
                notes: null,
              }
            : undefined
        }
        saveAction={createInvoiceDraft.bind(null, orgSlug)}
        issueAction={createAndIssueInvoice.bind(null, orgSlug)}
      />
    </div>
  );
}
