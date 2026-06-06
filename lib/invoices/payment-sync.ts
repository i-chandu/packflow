import { deriveInvoiceStatusFromPayments } from "@/lib/invoices/payment-status";
import { prisma } from "@/lib/prisma";

export async function syncInvoicePaymentStatus(
  organizationId: string,
  invoiceId: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });
  if (!invoice || invoice.status === "draft" || invoice.status === "cancelled") {
    return;
  }

  const allocSum = await prisma.paymentAllocation.aggregate({
    where: { invoiceId },
    _sum: { amountCents: true },
  });
  const amountPaidCents = allocSum._sum.amountCents ?? BigInt(0);
  const status = deriveInvoiceStatusFromPayments({
    currentStatus: invoice.status,
    grandTotalCents: invoice.grandTotalCents,
    amountPaidCents,
  });
  const balanceDueCents =
    invoice.grandTotalCents > amountPaidCents
      ? invoice.grandTotalCents - amountPaidCents
      : BigInt(0);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaidCents, balanceDueCents, status },
  });
}
