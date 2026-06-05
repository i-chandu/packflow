import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getInvoiceById, getInvoiceAuditTimeline } from "@/lib/queries/invoices";
import { canWriteOperations, canManageOrg } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const [invoice, timeline] = await Promise.all([
    getInvoiceById(ctx.organization.id, id),
    getInvoiceAuditTimeline(ctx.organization.id, id),
  ]);
  if (!invoice) notFound();

  const canWrite = canWriteOperations(ctx.membership.role);
  const canManage = canManageOrg(ctx.membership.role);
  const customer = invoice.customer;

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber ?? "Draft invoice"}
        description={
          invoice.invoiceDate
            ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                dateStyle: "medium",
              })
            : "Not issued yet"
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <InvoiceDetailActions
              orgSlug={orgSlug}
              invoiceId={id}
              status={invoice.status}
              canWrite={canWrite}
              canManage={canManage}
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Subtotal</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(invoice.subtotalCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Grand total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(invoice.grandTotalCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(invoice.amountPaidCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(invoice.balanceDueCents)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {customer ? (
              <>
                <Link
                  href={`/${orgSlug}/clients/${customer.id}`}
                  className="font-medium hover:underline"
                >
                  {customer.name}
                </Link>
                {customer.phone && <p className="text-zinc-600">{customer.phone}</p>}
                {customer.email && <p className="text-zinc-600">{customer.email}</p>}
                {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
              </>
            ) : (
              <p className="text-zinc-500">No client assigned</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment summary</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.allocations.length === 0 ? (
              <p className="text-sm text-zinc-500">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {invoice.allocations.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      {new Date(a.payment.paymentDate).toLocaleDateString("en-IN")} ·{" "}
                      {a.payment.method}
                      {a.payment.reference ? ` · ${a.payment.reference}` : ""}
                    </span>
                    <span className="font-medium">{formatINR(a.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
            {invoice.totalProfitCents > BigInt(0) && invoice.status !== "draft" && (
              <p className="mt-4 text-sm text-zinc-600">
                Estimated profit: {formatINR(invoice.totalProfitCents)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 text-left font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2">
                      {line.description}
                      {line.productId && (
                        <span className="block text-xs text-zinc-500">
                          {line.boxName}
                          {line.lengthMm &&
                            ` · ${Number(line.lengthMm)}×${Number(line.widthMm)}×${Number(line.heightMm)}`}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">{Number(line.quantity)}</td>
                    <td className="py-2 text-right">{formatINR(line.sellingRateCents)}</td>
                    <td className="py-2 text-right">{formatINR(line.lineAmountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{invoice.notes}</CardContent>
        </Card>
      )}

      {invoice.duplicatedFrom && (
        <p className="text-sm text-zinc-500">
          Duplicated from{" "}
          <Link
            href={`/${orgSlug}/invoices/${invoice.duplicatedFrom.id}`}
            className="hover:underline"
          >
            {invoice.duplicatedFrom.invoiceNumber ?? "invoice"}
          </Link>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {timeline.map((event) => (
                <li key={event.id} className="flex justify-between gap-2">
                  <span className="capitalize">{event.action.replace("_", " ")}</span>
                  <span className="text-zinc-500">
                    {new Date(event.createdAt).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
              {invoice.issuedAt && (
                <li className="flex justify-between gap-2">
                  <span>Issued</span>
                  <span className="text-zinc-500">
                    {new Date(invoice.issuedAt).toLocaleString("en-IN")}
                  </span>
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
