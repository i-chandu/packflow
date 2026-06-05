import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getSupplierById } from "@/lib/queries/suppliers";
import { getSupplierLedger } from "@/lib/queries/ledger";
import { LedgerTable } from "@/components/shared/ledger-table";

export default async function SupplierLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { orgSlug, id } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const supplier = await getSupplierById(ctx.organization.id, id);
  if (!supplier) notFound();

  const entries = await getSupplierLedger({
    organizationId: ctx.organization.id,
    supplierId: id,
    from: sp.from,
    to: sp.to,
  });

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap gap-3">
        <input
          type="date"
          name="from"
          defaultValue={sp.from}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        />
        <input
          type="date"
          name="to"
          defaultValue={sp.to}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Filter
        </button>
      </form>
      <LedgerTable entries={entries} partyType="supplier" />
    </div>
  );
}
