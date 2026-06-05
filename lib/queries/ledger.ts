import { prisma } from "@/lib/prisma";

export async function getCustomerLedger(params: {
  organizationId: string;
  customerId: string;
  from?: string;
  to?: string;
}) {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      organizationId: params.organizationId,
      customerId: params.customerId,
      ...(params.from || params.to
        ? {
            entryDate: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  let balance = BigInt(0);
  const withBalance = entries.map((e) => {
    balance += e.debitCents - e.creditCents;
    return { ...e, runningBalanceCents: balance };
  });

  return withBalance.reverse();
}

export async function getSupplierLedger(params: {
  organizationId: string;
  supplierId: string;
  from?: string;
  to?: string;
}) {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      organizationId: params.organizationId,
      supplierId: params.supplierId,
      ...(params.from || params.to
        ? {
            entryDate: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });

  let balance = BigInt(0);
  const withBalance = entries.map((e) => {
    balance += e.creditCents - e.debitCents;
    return { ...e, runningBalanceCents: balance };
  });

  return withBalance.reverse();
}
