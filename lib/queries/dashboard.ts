import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCustomerOutstandingBatch } from "@/lib/ledger/running-balance";

const ISSUED_STATUSES: InvoiceStatus[] = ["issued", "partially_paid", "paid"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDashboardMetrics(organizationId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const issuedFilter = {
    organizationId,
    status: { in: ISSUED_STATUSES },
  };

  const [todaySales, monthSales, mtdProfit, customers, recentInvoices] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: {
          ...issuedFilter,
          invoiceDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { grandTotalCents: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...issuedFilter,
          invoiceDate: { gte: monthStart, lte: todayEnd },
        },
        _sum: { grandTotalCents: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...issuedFilter,
          invoiceDate: { gte: monthStart, lte: todayEnd },
        },
        _sum: { totalProfitCents: true },
      }),
      prisma.customer.findMany({
        where: { organizationId, isActive: true },
        select: { id: true },
      }),
      prisma.invoice.findMany({
        where: { organizationId, status: { not: "draft" } },
        orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
        take: 8,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
    ]);

  const outstandingMap = await getCustomerOutstandingBatch(
    organizationId,
    customers.map((c) => c.id),
  );
  let totalOutstanding = BigInt(0);
  for (const balance of outstandingMap.values()) {
    if (balance > BigInt(0)) totalOutstanding += balance;
  }

  return {
    todaySalesCents: todaySales._sum?.grandTotalCents ?? BigInt(0),
    monthSalesCents: monthSales._sum?.grandTotalCents ?? BigInt(0),
    outstandingCents: totalOutstanding,
    mtdProfitCents: mtdProfit._sum?.totalProfitCents ?? BigInt(0),
    recentInvoices,
  };
}
