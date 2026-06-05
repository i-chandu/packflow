import { prisma } from "@/lib/prisma";
import { getCustomerOutstandingCents } from "@/lib/ledger/customer-balance";
import { getPagination, paginationMeta } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export async function listCustomers(params: {
  organizationId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { skip, take, page, pageSize } = getPagination(params);

  const where: Prisma.CustomerWhereInput = {
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
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { name: "asc" },
    }),
    prisma.customer.count({ where }),
  ]);

  const withOutstanding = await Promise.all(
    items.map(async (c) => ({
      ...c,
      outstandingCents: await getCustomerOutstandingCents(
        params.organizationId,
        c.id,
      ),
    })),
  );

  return {
    items: withOutstanding,
    meta: paginationMeta(total, page, pageSize),
  };
}

export async function getCustomerById(organizationId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          invoiceDate: true,
          grandTotalCents: true,
          balanceDueCents: true,
        },
      },
    },
  });

  if (!customer) return null;

  const outstandingCents = await getCustomerOutstandingCents(
    organizationId,
    customerId,
  );

  const ledgerAdjustment = await prisma.ledgerEntry.aggregate({
    where: {
      organizationId,
      customerId,
      entryType: "adjustment",
    },
    _sum: { debitCents: true, creditCents: true },
  });

  return {
    ...customer,
    outstandingCents,
    openingBalanceCents:
      (ledgerAdjustment._sum.debitCents ?? BigInt(0)) -
      (ledgerAdjustment._sum.creditCents ?? BigInt(0)),
  };
}
