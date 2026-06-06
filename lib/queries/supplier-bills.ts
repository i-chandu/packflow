import { prisma } from "@/lib/prisma";

export async function getSupplierBillById(organizationId: string, billId: string) {
  return prisma.supplierBill.findFirst({
    where: { id: billId, organizationId },
    include: {
      supplier: true,
      allocations: {
        orderBy: { allocatedAt: "desc" },
        include: {
          payment: {
            select: {
              id: true,
              paymentDate: true,
              method: true,
              reference: true,
              amountCents: true,
            },
          },
        },
      },
    },
  });
}

export async function listSupplierBillsForSupplier(
  organizationId: string,
  supplierId: string,
) {
  return prisma.supplierBill.findMany({
    where: { organizationId, supplierId },
    orderBy: { billDate: "desc" },
  });
}
