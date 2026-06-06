import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function getCustomerLedgerBalanceCents(
  organizationId: string,
  customerId: string,
  tx?: Tx,
): Promise<bigint> {
  const db = tx ?? prisma;
  const entries = await db.ledgerEntry.findMany({
    where: { organizationId, customerId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    select: { debitCents: true, creditCents: true },
  });
  return entries.reduce(
    (bal, e) => bal + e.debitCents - e.creditCents,
    BigInt(0),
  );
}

export async function getSupplierLedgerBalanceCents(
  organizationId: string,
  supplierId: string,
  tx?: Tx,
): Promise<bigint> {
  const db = tx ?? prisma;
  const entries = await db.ledgerEntry.findMany({
    where: { organizationId, supplierId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    select: { debitCents: true, creditCents: true },
  });
  return entries.reduce(
    (bal, e) => bal + e.creditCents - e.debitCents,
    BigInt(0),
  );
}

export async function nextCustomerRunningBalanceCents(
  organizationId: string,
  customerId: string,
  deltaDebit: bigint,
  deltaCredit: bigint,
  tx?: Tx,
): Promise<bigint> {
  const current = await getCustomerLedgerBalanceCents(
    organizationId,
    customerId,
    tx,
  );
  return current + deltaDebit - deltaCredit;
}

export async function nextSupplierRunningBalanceCents(
  organizationId: string,
  supplierId: string,
  deltaDebit: bigint,
  deltaCredit: bigint,
  tx?: Tx,
): Promise<bigint> {
  const current = await getSupplierLedgerBalanceCents(
    organizationId,
    supplierId,
    tx,
  );
  return current + deltaCredit - deltaDebit;
}

export async function getCustomerOutstandingBatch(
  organizationId: string,
  customerIds: string[],
): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>();
  if (customerIds.length === 0) return map;

  const grouped = await prisma.ledgerEntry.groupBy({
    by: ["customerId"],
    where: {
      organizationId,
      customerId: { in: customerIds },
    },
    _sum: { debitCents: true, creditCents: true },
  });

  for (const row of grouped) {
    if (!row.customerId) continue;
    const debit = row._sum.debitCents ?? BigInt(0);
    const credit = row._sum.creditCents ?? BigInt(0);
    map.set(row.customerId, debit - credit);
  }

  for (const id of customerIds) {
    if (!map.has(id)) map.set(id, BigInt(0));
  }

  return map;
}
