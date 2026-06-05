import { rupeesToCents } from "@/lib/money";
import type { InvoiceLineInput } from "@/lib/validations/invoice";

export type LineTotals = {
  lineAmountCents: bigint;
  lineProfitCents: bigint;
  purchaseRateCents: bigint;
  sellingRateCents: bigint;
};

export type InvoiceTotals = {
  subtotalCents: bigint;
  grandTotalCents: bigint;
  totalProfitCents: bigint;
  lineTotals: LineTotals[];
};

export function calculateLineTotals(
  line: InvoiceLineInput,
  purchaseRateCents: bigint = BigInt(0),
): LineTotals {
  const sellingRateCents = rupeesToCents(line.rate);
  const qty = line.quantity;
  const lineAmountCents = BigInt(Math.round(qty * Number(sellingRateCents)));
  const unitProfit = sellingRateCents - purchaseRateCents;
  const lineProfitCents =
    line.lineType === "product"
      ? BigInt(Math.round(qty * Number(unitProfit)))
      : BigInt(0);

  return {
    lineAmountCents,
    lineProfitCents,
    purchaseRateCents,
    sellingRateCents,
  };
}

export function calculateInvoiceTotals(
  lines: InvoiceLineInput[],
  purchaseRates: Map<string, bigint> = new Map(),
): InvoiceTotals {
  const lineTotals = lines.map((line) =>
    calculateLineTotals(
      line,
      line.productId ? purchaseRates.get(line.productId) ?? BigInt(0) : BigInt(0),
    ),
  );

  const subtotalCents = lineTotals.reduce(
    (sum, lt) => sum + lt.lineAmountCents,
    BigInt(0),
  );
  const totalProfitCents = lineTotals.reduce(
    (sum, lt) => sum + lt.lineProfitCents,
    BigInt(0),
  );

  return {
    subtotalCents,
    grandTotalCents: subtotalCents,
    totalProfitCents,
    lineTotals,
  };
}
