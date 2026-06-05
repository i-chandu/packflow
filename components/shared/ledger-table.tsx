import { formatINR } from "@/lib/money";
import type { LedgerEntry } from "@prisma/client";

type LedgerRow = LedgerEntry & { runningBalanceCents: bigint };

export function LedgerTable({
  entries,
  partyType,
}: {
  entries: LedgerRow[];
  partyType: "customer" | "supplier";
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-500">No ledger entries yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-left font-medium">Reference</th>
            <th className="px-4 py-3 text-right font-medium">
              {partyType === "customer" ? "Debit" : "Credit"}
            </th>
            <th className="px-4 py-3 text-right font-medium">
              {partyType === "customer" ? "Credit" : "Debit"}
            </th>
            <th className="px-4 py-3 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
              <td className="px-4 py-3">
                {new Date(e.entryDate).toLocaleDateString("en-IN")}
              </td>
              <td className="px-4 py-3 capitalize">{e.entryType.replace("_", " ")}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {e.referenceLabel ?? e.memo ?? "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {partyType === "customer"
                  ? e.debitCents > BigInt(0)
                    ? formatINR(e.debitCents)
                    : "—"
                  : e.creditCents > BigInt(0)
                    ? formatINR(e.creditCents)
                    : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {partyType === "customer"
                  ? e.creditCents > BigInt(0)
                    ? formatINR(e.creditCents)
                    : "—"
                  : e.debitCents > BigInt(0)
                    ? formatINR(e.debitCents)
                    : "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatINR(e.runningBalanceCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
