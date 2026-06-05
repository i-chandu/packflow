import type { InvoiceStatus } from "@prisma/client";

export function deriveInvoiceStatusFromPayments(params: {
  currentStatus: InvoiceStatus;
  grandTotalCents: bigint;
  amountPaidCents: bigint;
}): InvoiceStatus {
  const { currentStatus, grandTotalCents, amountPaidCents } = params;

  if (currentStatus === "draft" || currentStatus === "cancelled") {
    return currentStatus;
  }

  if (amountPaidCents <= BigInt(0)) {
    return "issued";
  }

  if (amountPaidCents >= grandTotalCents) {
    return "paid";
  }

  return "partially_paid";
}

export function syncPaymentAmounts(params: {
  grandTotalCents: bigint;
  amountPaidCents: bigint;
}): { balanceDueCents: bigint; status: InvoiceStatus } {
  const balanceDueCents =
    params.grandTotalCents > params.amountPaidCents
      ? params.grandTotalCents - params.amountPaidCents
      : BigInt(0);

  const status = deriveInvoiceStatusFromPayments({
    currentStatus: "issued",
    grandTotalCents: params.grandTotalCents,
    amountPaidCents: params.amountPaidCents,
  });

  return { balanceDueCents, status };
}
