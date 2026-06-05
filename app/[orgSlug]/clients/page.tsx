import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { listCustomers } from "@/lib/queries/customers";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const { items, meta } = await listCustomers({
    organizationId: ctx.organization.id,
    search: sp.search,
    page: sp.page ? parseInt(sp.page, 10) : 1,
  });

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/clients`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Customer master and outstanding balances."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href={`${basePath}/new`}>Add client</Link>
            </Button>
          ) : undefined
        }
      />

      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium" htmlFor="search">
            Search
          </label>
          <Input
            id="search"
            name="search"
            defaultValue={sp.search}
            placeholder="Name, phone, or email…"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="Add your first client."
          action={
            canWrite ? (
              <Button asChild>
                <Link href={`${basePath}/new`}>Add client</Link>
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
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">City</th>
                  <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {c.phone ?? c.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">{c.city ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {c.outstandingCents > BigInt(0) ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {formatINR(c.outstandingCents)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <Link href={`${basePath}/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <Badge variant={c.isActive ? "default" : "secondary"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {c.outstandingCents > BigInt(0) && (
                      <span className="text-amber-700 dark:text-amber-400">
                        {formatINR(c.outstandingCents)} due
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationControls
            basePath={basePath}
            page={meta.page}
            totalPages={meta.totalPages}
            searchParams={{ search: sp.search }}
          />
        </>
      )}
    </div>
  );
}
