import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getCustomerById } from "@/lib/queries/customers";
import { formatINR } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const customer = await getCustomerById(ctx.organization.id, id);
  if (!customer) notFound();

  const address = [
    customer.addressLine1,
    customer.addressLine2,
    [customer.city, customer.billingState, customer.postalCode]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              Outstanding balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatINR(customer.outstandingCents)}
          </CardContent>
        </Card>
        {customer.openingBalanceCents > BigInt(0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                Opening balance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatINR(customer.openingBalanceCents)}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-zinc-500">Phone:</span> {customer.phone ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">Email:</span> {customer.email ?? "—"}
          </p>
          <p>
            <span className="text-zinc-500">GSTIN:</span> {customer.gstin ?? "—"}
          </p>
          {address && (
            <p className="whitespace-pre-line sm:col-span-2">
              <span className="text-zinc-500">Address:</span>
              <br />
              {address}
            </p>
          )}
          {customer.notes && (
            <p className="sm:col-span-2">
              <span className="text-zinc-500">Notes:</span> {customer.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/invoices?customer=${id}`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {customer.invoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 text-left font-medium">Invoice</th>
                    <th className="py-2 text-left font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Total</th>
                    <th className="py-2 text-right font-medium">Due</th>
                    <th className="py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-2">
                        <Link
                          href={`/${orgSlug}/invoices/${inv.id}`}
                          className="hover:underline"
                        >
                          {inv.invoiceNumber ?? "Draft"}
                        </Link>
                      </td>
                      <td className="py-2">
                        {inv.invoiceDate
                          ? new Date(inv.invoiceDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="py-2 text-right">{formatINR(inv.grandTotalCents)}</td>
                      <td className="py-2 text-right">
                        {inv.balanceDueCents > BigInt(0)
                          ? formatINR(inv.balanceDueCents)
                          : "—"}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary">{inv.status.replace("_", " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
