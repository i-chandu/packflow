import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getSupplierById } from "@/lib/queries/suppliers";
import { formatINR } from "@/lib/money";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default async function SupplierOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const supplier = await getSupplierById(ctx.organization.id, id);
  if (!supplier) notFound();

  const address = [
    supplier.addressLine1,
    supplier.addressLine2,
    [supplier.city, supplier.state, supplier.postalCode].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Phone:</span> {supplier.phone ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">Email:</span> {supplier.email ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">GSTIN:</span> {supplier.gstin ?? "—"}
          </p>
          {address && (
            <p className="whitespace-pre-line sm:col-span-2">
              <span className="text-zinc-500">Address:</span>
              <br />
              {address}
            </p>
          )}
          {supplier.notes && (
            <p className="sm:col-span-2">
              <span className="text-zinc-500">Notes:</span> {supplier.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Products ({supplier._count.products})</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.products.length === 0 ? (
            <EmptyState
              title="No products"
              description="Products linked to this manufacturer appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 text-left font-medium">Name</th>
                    <th className="py-2 text-right font-medium">Purchase</th>
                    <th className="py-2 text-right font-medium">Selling</th>
                    <th className="py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.products.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-2">
                        <Link
                          href={`/${orgSlug}/products/${p.id}`}
                          className="hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right">{formatINR(p.purchaseRateCents)}</td>
                      <td className="py-2 text-right">{formatINR(p.sellingRateCents)}</td>
                      <td className="py-2">
                        <ProductStatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent bills</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/suppliers/${id}/bills`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {supplier.supplierBills.length === 0 ? (
            <p className="text-sm text-zinc-500">No bills recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {supplier.supplierBills.slice(0, 5).map((bill) => (
                <li key={bill.id} className="flex justify-between gap-2">
                  <span>
                    {bill.billNumber} · {new Date(bill.billDate).toLocaleDateString("en-IN")}
                  </span>
                  <span>
                    {formatINR(bill.balanceDueCents)} due · {bill.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
