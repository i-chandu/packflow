import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { listPayments } from "@/lib/queries/payments";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ direction?: string; search?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const direction =
    sp.direction === "inbound" || sp.direction === "outbound"
      ? sp.direction
      : "all";

  const { items, meta } = await listPayments({
    organizationId: ctx.organization.id,
    direction,
    search: sp.search,
    page: sp.page ? parseInt(sp.page, 10) : 1,
  });

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/payments`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Inbound client receipts and outbound supplier payments."
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`${basePath}/supplier/new`}>Pay supplier</Link>
              </Button>
              <Button asChild>
                <Link href={`${basePath}/new`}>Record payment</Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {[
            { value: "all", label: "All" },
            { value: "inbound", label: "Inbound" },
            { value: "outbound", label: "Outbound" },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={direction === tab.value ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link
                href={`${basePath}?direction=${tab.value}${sp.search ? `&search=${encodeURIComponent(sp.search)}` : ""}`}
              >
                {tab.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Record a client payment or supplier payout to get started."
          action={
            canWrite ? (
              <Button asChild>
                <Link href={`${basePath}/new`}>Record payment</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Direction</th>
                  <th className="px-4 py-3 text-left font-medium">Party</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Unallocated</th>
                  <th className="px-4 py-3 text-left font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {items.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/${payment.id}`}
                        className="font-medium hover:underline"
                      >
                        {new Date(payment.paymentDate).toLocaleDateString("en-IN")}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {payment.direction === "inbound" ? "Inbound" : "Outbound"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {payment.customer?.name ?? payment.supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatINR(payment.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.unallocatedCents > BigInt(0)
                        ? formatINR(payment.unallocatedCents)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {payment.method.replace("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            basePath={basePath}
            page={meta.page}
            totalPages={meta.totalPages}
            searchParams={{
              direction: direction !== "all" ? direction : undefined,
              search: sp.search,
            }}
          />
        </>
      )}
    </div>
  );
}
