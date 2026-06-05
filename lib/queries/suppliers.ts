import { prisma } from "@/lib/prisma";
import { getPagination, paginationMeta } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export async function listSuppliers(params: {
  organizationId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { skip, take, page, pageSize } = getPagination(params);

  const where: Prisma.SupplierWhereInput = {
    organizationId: params.organizationId,
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { phone: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  const payableBySupplier = await prisma.supplierBill.groupBy({
    by: ["supplierId"],
    where: {
      organizationId: params.organizationId,
      balanceDueCents: { gt: 0 },
      supplierId: { in: items.map((s) => s.id) },
    },
    _sum: { balanceDueCents: true },
  });

  const payableMap = new Map(
    payableBySupplier.map((p) => [p.supplierId, p._sum.balanceDueCents ?? BigInt(0)]),
  );

  return {
    items: items.map((s) => ({
      ...s,
      payableCents: payableMap.get(s.id) ?? BigInt(0),
    })),
    meta: paginationMeta(total, page, pageSize),
  };
}

export async function getSupplierById(organizationId: string, supplierId: string) {
  return prisma.supplier.findFirst({
    where: { id: supplierId, organizationId },
    include: {
      products: {
        orderBy: { name: "asc" },
        take: 50,
      },
      supplierBills: {
        orderBy: { billDate: "desc" },
        take: 20,
      },
      _count: { select: { products: true, supplierBills: true } },
    },
  });
}
