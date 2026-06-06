import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getSupplierBillById } from "@/lib/queries/supplier-bills";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierBillDeleteButton } from "@/components/supplier-bills/supplier-bill-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SupplierBillDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const bill = await getSupplierBillById(ctx.organization.id, id);
  if (!bill) notFound();

  const canWrite = canWriteOperations(ctx.membership.role);
  const canEdit =
    canWrite &&
    bill.status !== "void" &&
    bill.allocations.length === 0 &&
    bill.amountPaidCents === BigInt(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={bill.billNumber}
        description={bill.supplier.name}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${orgSlug}/supplier-bills/${id}/edit`}>Edit</Link>
                </Button>
              )}
              {bill.balanceDueCents > BigInt(0) && bill.status !== "void" && (
                <Button size="sm" asChild>
                  <Link
                    href={`/${orgSlug}/payments/supplier/new?supplierId=${bill.supplierId}&supplierBillId=${id}`}
                  >
                    Record payment
                  </Link>
                </Button>
              )}
              {canEdit && (
                <SupplierBillDeleteButton orgSlug={orgSlug} billId={id} />
              )}
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(bill.grandTotalCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Balance due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {bill.balanceDueCents > BigInt(0)
                ? formatINR(bill.balanceDueCents)
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{bill.status.replace("_", " ")}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Bill date:</span>{" "}
            {new Date(bill.billDate).toLocaleDateString("en-IN")}
          </p>
          <p>
            <span className="text-zinc-500">Due date:</span>{" "}
            {bill.dueDate
              ? new Date(bill.dueDate).toLocaleDateString("en-IN")
              : "—"}
          </p>
          {bill.reference && (
            <p>
              <span className="text-zinc-500">Reference:</span> {bill.reference}
            </p>
          )}
        </CardContent>
      </Card>

      {bill.allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bill.allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="flex items-center justify-between text-sm"
              >
                <Link
                  href={`/${orgSlug}/payments/${alloc.payment.id}`}
                  className="hover:underline"
                >
                  {new Date(alloc.payment.paymentDate).toLocaleDateString("en-IN")}
                  {alloc.payment.reference ? ` · ${alloc.payment.reference}` : ""}
                </Link>
                <span className="font-medium">{formatINR(alloc.amountCents)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {bill.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{bill.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
