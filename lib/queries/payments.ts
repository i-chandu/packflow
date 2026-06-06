import { prisma } from "@/lib/prisma";
import { getPagination, paginationMeta } from "@/lib/pagination";
import type { PaymentDirection, Prisma } from "@prisma/client";

export async function listPayments(params: {
  organizationId: string;
  direction?: PaymentDirection | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { skip, take, page, pageSize } = getPagination(params);

  const where: Prisma.PaymentWhereInput = {
    organizationId: params.organizationId,
    ...(params.direction && params.direction !== "all"
      ? { direction: params.direction }
      : {}),
    ...(params.search
      ? {
          OR: [
            { reference: { contains: params.search, mode: "insensitive" } },
            { customer: { name: { contains: params.search, mode: "insensitive" } } },
            { supplier: { name: { contains: params.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
            supplierBill: { select: { id: true, billNumber: true } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: items.map((p) => ({
      ...p,
      unallocatedCents: p.amountCents - p.allocatedCents,
    })),
    meta: paginationMeta(total, page, pageSize),
  };
}

export async function getPaymentById(organizationId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
    include: {
      customer: true,
      supplier: true,
      allocations: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              grandTotalCents: true,
              balanceDueCents: true,
            },
          },
          supplierBill: {
            select: {
              id: true,
              billNumber: true,
              grandTotalCents: true,
              balanceDueCents: true,
            },
          },
        },
      },
    },
  });

  if (!payment) return null;

  return {
    ...payment,
    unallocatedCents: payment.amountCents - payment.allocatedCents,
  };
}

export async function listOpenInvoicesForCustomer(
  organizationId: string,
  customerId: string,
) {
  return prisma.invoice.findMany({
    where: {
      organizationId,
      customerId,
      status: { in: ["issued", "partially_paid"] },
      balanceDueCents: { gt: 0 },
    },
    orderBy: { invoiceDate: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      balanceDueCents: true,
      grandTotalCents: true,
    },
  });
}

export async function listOpenBillsForSupplier(
  organizationId: string,
  supplierId: string,
) {
  return prisma.supplierBill.findMany({
    where: {
      organizationId,
      supplierId,
      status: { in: ["open", "partially_paid"] },
      balanceDueCents: { gt: 0 },
    },
    orderBy: { billDate: "asc" },
    select: {
      id: true,
      billNumber: true,
      billDate: true,
      balanceDueCents: true,
      grandTotalCents: true,
    },
  });
}
