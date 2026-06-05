import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getSupplierById } from "@/lib/queries/suppliers";
import { formatINR } from "@/lib/money";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";

export default async function SupplierBillsPage({
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

  if (supplier.supplierBills.length === 0) {
    return (
      <EmptyState
        title="No bills"
        description="Supplier bills will appear here when recorded."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Bill #</th>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Due</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Balance</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {supplier.supplierBills.map((bill) => (
            <tr
              key={bill.id}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
              <td className="px-4 py-3 font-medium">{bill.billNumber}</td>
              <td className="px-4 py-3">
                {new Date(bill.billDate).toLocaleDateString("en-IN")}
              </td>
              <td className="px-4 py-3">
                {bill.dueDate
                  ? new Date(bill.dueDate).toLocaleDateString("en-IN")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">{formatINR(bill.grandTotalCents)}</td>
              <td className="px-4 py-3 text-right">
                {bill.balanceDueCents > BigInt(0) ? (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {formatINR(bill.balanceDueCents)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{bill.status.replace("_", " ")}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
