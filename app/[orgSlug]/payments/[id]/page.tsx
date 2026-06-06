import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getPaymentById } from "@/lib/queries/payments";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentDeleteButton } from "@/components/payments/payment-delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const payment = await getPaymentById(ctx.organization.id, id);
  if (!payment) notFound();

  const canWrite = canWriteOperations(ctx.membership.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          payment.direction === "inbound" ? "Client payment" : "Supplier payment"
        }
        description={new Date(payment.paymentDate).toLocaleDateString("en-IN", {
          dateStyle: "long",
        })}
        actions={
          canWrite ? (
            <PaymentDeleteButton orgSlug={orgSlug} paymentId={payment.id} />
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(payment.amountCents)}</p>
            {payment.unallocatedCents > BigInt(0) && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                Unallocated: {formatINR(payment.unallocatedCents)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Party</CardTitle>
          </CardHeader>
          <CardContent>
            {payment.customer && (
              <Link
                href={`/${orgSlug}/clients/${payment.customer.id}`}
                className="font-medium hover:underline"
              >
                {payment.customer.name}
              </Link>
            )}
            {payment.supplier && (
              <Link
                href={`/${orgSlug}/suppliers/${payment.supplier.id}`}
                className="font-medium hover:underline"
              >
                {payment.supplier.name}
              </Link>
            )}
            <p className="mt-2 text-sm capitalize text-zinc-600">
              {payment.method.replace("_", " ")}
              {payment.reference ? ` · ${payment.reference}` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {payment.allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payment.allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  {alloc.invoice && (
                    <Link
                      href={`/${orgSlug}/invoices/${alloc.invoice.id}`}
                      className="font-medium hover:underline"
                    >
                      {alloc.invoice.invoiceNumber}
                    </Link>
                  )}
                  {alloc.supplierBill && (
                    <Link
                      href={`/${orgSlug}/supplier-bills/${alloc.supplierBill.id}`}
                      className="font-medium hover:underline"
                    >
                      {alloc.supplierBill.billNumber}
                    </Link>
                  )}
                </div>
                <Badge variant="secondary">{formatINR(alloc.amountCents)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {payment.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{payment.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
