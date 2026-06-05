import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getCustomerById } from "@/lib/queries/customers";
import { getCustomerLedger } from "@/lib/queries/ledger";
import { LedgerTable } from "@/components/shared/ledger-table";

export default async function ClientLedgerPage({
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

  const customer = await getCustomerById(ctx.organization.id, id);
  if (!customer) notFound();

  const entries = await getCustomerLedger({
    organizationId: ctx.organization.id,
    customerId: id,
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
      <LedgerTable entries={entries} partyType="customer" />
    </div>
  );
}
