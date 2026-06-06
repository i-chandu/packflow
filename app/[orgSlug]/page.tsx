import Link from "next/link";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getDashboardMetrics } from "@/lib/queries/dashboard";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) return null;
  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) return null;

  const metrics = await getDashboardMetrics(ctx.organization.id);
  const canWrite = canWriteOperations(ctx.membership.role);

  const kpis = [
    { label: "Today's sales", value: formatINR(metrics.todaySalesCents) },
    { label: "Monthly sales", value: formatINR(metrics.monthSalesCents) },
    { label: "Outstanding", value: formatINR(metrics.outstandingCents) },
    { label: "MTD profit", value: formatINR(metrics.mtdProfitCents) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href={`/${orgSlug}/invoices/new`}>+ New invoice</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${orgSlug}/invoices`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {metrics.recentInvoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/${orgSlug}/invoices/${invoice.id}`}
                      className="font-medium hover:underline"
                    >
                      {invoice.invoiceNumber ?? "Draft"}
                    </Link>
                    <p className="truncate text-zinc-500">
                      {invoice.customer?.name ?? "No client"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <InvoiceStatusBadge status={invoice.status} />
                    <span className="font-medium">
                      {formatINR(invoice.grandTotalCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
