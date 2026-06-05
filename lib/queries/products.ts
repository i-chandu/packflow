import { prisma } from "@/lib/prisma";
import { getPagination, paginationMeta } from "@/lib/pagination";
import type { ProductStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type ProductListParams = {
  organizationId: string;
  search?: string;
  status?: ProductStatus | "all";
  page?: number;
  pageSize?: number;
};

export async function listProducts(params: ProductListParams) {
  const { skip, take, page, pageSize } = getPagination(params);

  const where: Prisma.ProductWhereInput = {
    organizationId: params.organizationId,
    ...(params.status && params.status !== "all"
      ? { status: params.status }
      : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { ply: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    meta: paginationMeta(total, page, pageSize),
  };
}

export async function getProductById(organizationId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, organizationId },
    include: {
      supplier: true,
      priceHistory: {
        orderBy: { validFrom: "desc" },
        take: 50,
      },
      invoiceLines: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              invoiceDate: true,
              customer: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function listSuppliersForSelect(organizationId: string) {
  return prisma.supplier.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
