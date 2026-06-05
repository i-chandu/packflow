import { prisma } from "@/lib/prisma";
import { getPagination, paginationMeta } from "@/lib/pagination";
import type { InvoiceStatus, Prisma } from "@prisma/client";

export type InvoiceListParams = {
  organizationId: string;
  search?: string;
  status?: InvoiceStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  outstanding?: boolean;
  customerId?: string;
  page?: number;
  pageSize?: number;
};

export async function listInvoices(params: InvoiceListParams) {
  const { skip, take, page, pageSize } = getPagination(params);

  const where: Prisma.InvoiceWhereInput = {
    organizationId: params.organizationId,
    ...(params.status && params.status !== "all"
      ? { status: params.status }
      : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.outstanding
      ? {
          status: { in: ["issued", "partially_paid"] },
          balanceDueCents: { gt: 0 },
        }
      : {}),
    ...(params.dateFrom || params.dateTo
      ? {
          invoiceDate: {
            ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
            ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
          },
        }
      : {}),
    ...(params.search
      ? {
          OR: [
            { invoiceNumber: { contains: params.search, mode: "insensitive" } },
            {
              customer: {
                name: { contains: params.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items,
    meta: paginationMeta(total, page, pageSize),
  };
}

export async function getInvoiceById(organizationId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      customer: true,
      lines: { orderBy: { sortOrder: "asc" }, include: { product: true } },
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
      duplicatedFrom: {
        select: { id: true, invoiceNumber: true },
      },
      organization: {
        select: {
          name: true,
          legalName: true,
          gstin: true,
          logoUrl: true,
          invoicePrefix: true,
        },
      },
    },
  });
}

export async function listCustomersForInvoiceSelect(organizationId: string) {
  return prisma.customer.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true, gstin: true },
  });
}

export async function listProductsForInvoiceSelect(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId, status: "active" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      lengthMm: true,
      widthMm: true,
      heightMm: true,
      ply: true,
      gsm: true,
      purchaseRateCents: true,
      sellingRateCents: true,
    },
  });
}

export async function getInvoiceAuditTimeline(organizationId: string, invoiceId: string) {
  return prisma.auditEvent.findMany({
    where: {
      organizationId,
      entityType: "invoice",
      entityId: invoiceId,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
