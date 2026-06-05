import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { listProducts } from "@/lib/queries/products";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductStatus } from "@prisma/client";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const status =
    sp.status === "active" || sp.status === "inactive"
      ? (sp.status as ProductStatus)
      : "all";

  const { items, meta } = await listProducts({
    organizationId: ctx.organization.id,
    search: sp.search,
    status,
    page: sp.page ? parseInt(sp.page, 10) : 1,
  });

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/products`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Box catalog with dimensions, rates, and manufacturers."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href={`${basePath}/new`}>Add product</Link>
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
            placeholder="Name or ply…"
          />
        </div>
        <div className="w-full space-y-1 sm:w-40">
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <Select id="status" name="status" defaultValue={status}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <Button type="submit">Filter</Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Add your first box to the catalog."
          action={
            canWrite ? (
              <Button asChild>
                <Link href={`${basePath}/new`}>Add product</Link>
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
                  <th className="px-4 py-3 text-left font-medium">Dimensions</th>
                  <th className="px-4 py-3 text-left font-medium">GSM</th>
                  <th className="px-4 py-3 text-left font-medium">Manufacturer</th>
                  <th className="px-4 py-3 text-right font-medium">Purchase</th>
                  <th className="px-4 py-3 text-right font-medium">Selling</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {Number(p.lengthMm)}×{Number(p.widthMm)}×{Number(p.heightMm)}
                      {p.ply ? ` · ${p.ply} ply` : ""}
                    </td>
                    <td className="px-4 py-3">{p.gsm ? Number(p.gsm) : "—"}</td>
                    <td className="px-4 py-3">{p.supplier?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(p.purchaseRateCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(p.sellingRateCents)}
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <Link href={`${basePath}/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {Number(p.lengthMm)}×{Number(p.widthMm)}×{Number(p.heightMm)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <ProductStatusBadge status={p.status} />
                    <span>{formatINR(p.sellingRateCents)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationControls
            basePath={basePath}
            page={meta.page}
            totalPages={meta.totalPages}
            searchParams={{ search: sp.search, status: sp.status !== "all" ? status : undefined }}
          />
        </>
      )}
    </div>
  );
}
