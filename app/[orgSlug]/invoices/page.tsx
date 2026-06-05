import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { listInvoices } from "@/lib/queries/invoices";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { InvoiceStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partially_paid", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    outstanding?: string;
    page?: string;
  }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const status =
    sp.status && STATUS_OPTIONS.some((o) => o.value === sp.status && o.value !== "all")
      ? (sp.status as InvoiceStatus)
      : "all";

  const { items, meta } = await listInvoices({
    organizationId: ctx.organization.id,
    search: sp.search,
    status,
    dateFrom: sp.from,
    dateTo: sp.to,
    outstanding: sp.outstanding === "1",
    page: sp.page ? parseInt(sp.page, 10) : 1,
  });

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/invoices`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create, issue, and track client invoices."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href={`${basePath}/new`}>New invoice</Link>
            </Button>
          ) : undefined
        }
      />

      <form method="get" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-sm font-medium" htmlFor="search">
              Search
            </label>
            <Input
              id="search"
              name="search"
              defaultValue={sp.search}
              placeholder="Invoice # or client…"
            />
          </div>
          <div className="w-full space-y-1 sm:w-36">
            <label className="text-sm font-medium" htmlFor="status">
              Status
            </label>
            <Select id="status" name="status" defaultValue={status}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="from">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={sp.from} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="to">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={sp.to} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="outstanding"
              value="1"
              defaultChecked={sp.outstanding === "1"}
            />
            Outstanding only
          </label>
          <Button type="submit">Filter</Button>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Create your first invoice to get started."
          action={
            canWrite ? (
              <Button asChild>
                <Link href={`${basePath}/new`}>New invoice</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Invoice</th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.invoiceNumber ?? "Draft"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {inv.invoiceDate
                        ? new Date(inv.invoiceDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">{formatINR(inv.grandTotalCents)}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.balanceDueCents > BigInt(0) ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {formatINR(inv.balanceDueCents)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceRowActions
                        orgSlug={orgSlug}
                        invoiceId={inv.id}
                        status={inv.status}
                        canWrite={canWrite}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`${basePath}/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.invoiceNumber ?? "Draft"}
                      </Link>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {inv.customer?.name ?? "No client"}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>{formatINR(inv.grandTotalCents)}</span>
                    <InvoiceRowActions
                      orgSlug={orgSlug}
                      invoiceId={inv.id}
                      status={inv.status}
                      canWrite={canWrite}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationControls
            basePath={basePath}
            page={meta.page}
            totalPages={meta.totalPages}
            searchParams={{
              search: sp.search,
              status: status !== "all" ? status : undefined,
              from: sp.from,
              to: sp.to,
              outstanding: sp.outstanding,
            }}
          />
        </>
      )}
    </div>
  );
}
