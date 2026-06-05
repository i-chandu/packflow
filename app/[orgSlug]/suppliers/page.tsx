import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { listSuppliers } from "@/lib/queries/suppliers";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default async function SuppliersPage({
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

  const { items, meta } = await listSuppliers({
    organizationId: ctx.organization.id,
    search: sp.search,
    page: sp.page ? parseInt(sp.page, 10) : 1,
  });

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/suppliers`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manufacturers and outstanding payables."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href={`${basePath}/new`}>Add supplier</Link>
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
          title="No suppliers found"
          description="Add your first manufacturer."
          action={
            canWrite ? (
              <Button asChild>
                <Link href={`${basePath}/new`}>Add supplier</Link>
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
                  <th className="px-4 py-3 text-right font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {s.phone ?? s.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">{s._count.products}</td>
                    <td className="px-4 py-3 text-right">
                      {s.payableCents > BigInt(0) ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {formatINR(s.payableCents)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.isActive ? "default" : "secondary"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <Link href={`${basePath}/${s.id}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {s.payableCents > BigInt(0) && (
                      <span className="text-amber-700 dark:text-amber-400">
                        {formatINR(s.payableCents)} due
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
