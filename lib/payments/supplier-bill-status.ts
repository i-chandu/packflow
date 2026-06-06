import type { SupplierBillStatus } from "@prisma/client";

export function deriveSupplierBillStatus(params: {
  grandTotalCents: bigint;
  amountPaidCents: bigint;
}): SupplierBillStatus {
  const { grandTotalCents, amountPaidCents } = params;

  if (amountPaidCents <= BigInt(0)) {
    return "open";
  }

  if (amountPaidCents >= grandTotalCents) {
    return "paid";
  }

  return "partially_paid";
}

export function syncSupplierBillAmounts(params: {
  grandTotalCents: bigint;
  amountPaidCents: bigint;
}): { balanceDueCents: bigint; status: SupplierBillStatus } {
  const balanceDueCents =
    params.grandTotalCents > params.amountPaidCents
      ? params.grandTotalCents - params.amountPaidCents
      : BigInt(0);

  const status = deriveSupplierBillStatus({
    grandTotalCents: params.grandTotalCents,
    amountPaidCents: params.amountPaidCents,
  });

  return { balanceDueCents, status };
}
