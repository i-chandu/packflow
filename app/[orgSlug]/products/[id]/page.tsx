import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getProductById } from "@/lib/queries/products";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { ProductDeleteButton } from "@/components/products/product-delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const product = await getProductById(ctx.organization.id, id);
  if (!product) notFound();

  const marginPct =
    Number(product.sellingRateCents) > 0
      ? (
          (Number(product.sellingRateCents - product.purchaseRateCents) /
            Number(product.sellingRateCents)) *
          100
        ).toFixed(1)
      : "0";

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/products/${id}`;

  const purchaseHistory = product.priceHistory.filter((h) => h.rateType === "purchase");
  const sellingHistory = product.priceHistory.filter((h) => h.rateType === "selling");

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${Number(product.lengthMm)}×${Number(product.widthMm)}×${Number(product.heightMm)} mm`}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`${basePath}/edit`}>Edit</Link>
              </Button>
              <ProductDeleteButton orgSlug={orgSlug} productId={id} />
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Purchase rate</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(product.purchaseRateCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Selling rate</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(product.sellingRateCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Margin / unit</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(product.sellingRateCents - product.purchaseRateCents)}{" "}
            <span className="text-sm font-normal text-zinc-500">({marginPct}%)</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductStatusBadge status={product.status} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Ply:</span> {product.ply ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">GSM:</span>{" "}
            {product.gsm ? Number(product.gsm) : "—"}
          </p>
          <p>
            <span className="text-zinc-500">Manufacturer:</span>{" "}
            {product.supplier ? (
              <Link
                href={`/${orgSlug}/suppliers/${product.supplier.id}`}
                className="hover:underline"
              >
                {product.supplier.name}
              </Link>
            ) : (
              "—"
            )}
          </p>
          {product.notes && (
            <p className="sm:col-span-2">
              <span className="text-zinc-500">Notes:</span> {product.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchase price history</CardTitle>
          </CardHeader>
          <CardContent>
            {purchaseHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No history yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {purchaseHistory.map((h) => (
                  <li key={h.id} className="flex justify-between">
                    <span>{new Date(h.validFrom).toLocaleDateString("en-IN")}</span>
                    <span>{formatINR(h.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selling price history</CardTitle>
          </CardHeader>
          <CardContent>
            {sellingHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No history yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {sellingHistory.map((h) => (
                  <li key={h.id} className="flex justify-between">
                    <span>{new Date(h.validFrom).toLocaleDateString("en-IN")}</span>
                    <span>{formatINR(h.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {product.invoiceLines.length === 0 ? (
            <p className="text-sm text-zinc-500">Not used on any invoice yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {product.invoiceLines.map((line) => (
                <li key={line.id} className="flex justify-between gap-2">
                  <Link
                    href={`/${orgSlug}/invoices/${line.invoice.id}`}
                    className="hover:underline"
                  >
                    {line.invoice.invoiceNumber ?? "Draft"} · {line.invoice.customer?.name}
                  </Link>
                  <span className="text-zinc-500">{line.invoice.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
