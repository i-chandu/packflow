import { prisma } from "@/lib/prisma";
import { getCustomerLedgerBalanceCents } from "@/lib/ledger/running-balance";

export async function getCustomerOutstandingCents(
  organizationId: string,
  customerId: string,
): Promise<bigint> {
  const balance = await getCustomerLedgerBalanceCents(organizationId, customerId);
  return balance > BigInt(0) ? balance : BigInt(0);
}

export async function getSupplierPayableCents(
  organizationId: string,
  supplierId: string,
): Promise<bigint> {
  const result = await prisma.supplierBill.aggregate({
    where: {
      organizationId,
      supplierId,
      status: { in: ["open", "partially_paid"] },
      balanceDueCents: { gt: 0 },
    },
    _sum: { balanceDueCents: true },
  });
  return result._sum.balanceDueCents ?? BigInt(0);
}
