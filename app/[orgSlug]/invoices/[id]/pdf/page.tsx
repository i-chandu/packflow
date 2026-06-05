import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getInvoiceById } from "@/lib/queries/invoices";
import { InvoicePdfDocument } from "@/components/invoices/invoice-pdf-document";
import { PrintToolbar } from "@/components/invoices/print-toolbar";

export default async function InvoicePdfPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const invoice = await getInvoiceById(ctx.organization.id, id);
  if (!invoice) notFound();
  if (invoice.status === "draft") notFound();

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <PrintToolbar backHref={`/${orgSlug}/invoices/${id}`} />
      <div className="mx-auto max-w-4xl p-4 print:p-0">
        <InvoicePdfDocument invoice={invoice} />
      </div>
    </div>
  );
}
