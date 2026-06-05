import { prisma } from "@/lib/prisma";
import type { InvoiceStatus } from "@prisma/client";

const OUTSTANDING_STATUSES: InvoiceStatus[] = ["issued", "partially_paid"];

export async function getCustomerOutstandingCents(
  organizationId: string,
  customerId: string,
): Promise<bigint> {
  const result = await prisma.invoice.aggregate({
    where: {
      organizationId,
      customerId,
      status: { in: OUTSTANDING_STATUSES },
    },
    _sum: { balanceDueCents: true },
  });
  return result._sum.balanceDueCents ?? BigInt(0);
}

export async function getSupplierPayableCents(
  organizationId: string,
  supplierId: string,
): Promise<bigint> {
  const result = await prisma.supplierBill.aggregate({
    where: {
      organizationId,
      supplierId,
      balanceDueCents: { gt: 0 },
    },
    _sum: { balanceDueCents: true },
  });
  return result._sum.balanceDueCents ?? BigInt(0);
}
