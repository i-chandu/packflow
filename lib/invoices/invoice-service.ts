import { Prisma } from "@prisma/client";
import type { InvoiceLineInput } from "@/lib/validations/invoice";
import { calculateInvoiceTotals } from "@/lib/invoices/calculate-totals";
import { allocateInvoiceNumber } from "@/lib/invoices/invoice-number";
import { prisma } from "@/lib/prisma";

type ProductSnapshot = {
  id: string;
  name: string;
  lengthMm: Prisma.Decimal;
  widthMm: Prisma.Decimal;
  heightMm: Prisma.Decimal;
  ply: string | null;
  gsm: Prisma.Decimal | null;
  purchaseRateCents: bigint;
  sellingRateCents: bigint;
};

async function loadProducts(
  organizationId: string,
  lines: InvoiceLineInput[],
): Promise<Map<string, ProductSnapshot>> {
  const productIds = lines
    .map((l) => l.productId)
    .filter((id): id is string => Boolean(id));

  if (productIds.length === 0) return new Map();

  const products = await prisma.product.findMany({
    where: { organizationId, id: { in: productIds } },
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

  return new Map(products.map((p) => [p.id, p]));
}

function buildLineCreateData(
  organizationId: string,
  invoiceId: string,
  line: InvoiceLineInput,
  sortOrder: number,
  product: ProductSnapshot | undefined,
  totals: ReturnType<typeof calculateInvoiceTotals>["lineTotals"][number],
) {
  return {
    organizationId,
    invoiceId,
    lineType: line.lineType,
    sortOrder,
    productId: line.productId || null,
    description: line.description,
    boxName: product?.name ?? null,
    lengthMm: product?.lengthMm ?? null,
    widthMm: product?.widthMm ?? null,
    heightMm: product?.heightMm ?? null,
    ply: product?.ply ?? null,
    gsm: product?.gsm ?? null,
    quantity: new Prisma.Decimal(line.quantity),
    purchaseRateCents: totals.purchaseRateCents,
    sellingRateCents: totals.sellingRateCents,
    lineAmountCents: totals.lineAmountCents,
    lineProfitCents: totals.lineProfitCents,
    customChargeLabel:
      line.lineType === "custom" ? line.customChargeLabel || line.description : null,
  };
}

export async function createInvoiceWithLines(params: {
  organizationId: string;
  userId: string;
  customerId?: string | null;
  invoiceDate: Date;
  dueDate?: Date | null;
  notes?: string | null;
  lines: InvoiceLineInput[];
  duplicatedFromInvoiceId?: string | null;
}) {
  const products = await loadProducts(params.organizationId, params.lines);
  const purchaseRates = new Map(
    [...products.entries()].map(([id, p]) => [id, p.purchaseRateCents]),
  );
  const totals = calculateInvoiceTotals(params.lines, purchaseRates);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        organizationId: params.organizationId,
        customerId: params.customerId || null,
        status: "draft",
        invoiceDate: params.invoiceDate,
        dueDate: params.dueDate ?? null,
        subtotalCents: totals.subtotalCents,
        grandTotalCents: totals.grandTotalCents,
        balanceDueCents: BigInt(0),
        amountPaidCents: BigInt(0),
        totalProfitCents: totals.totalProfitCents,
        notes: params.notes?.trim() || null,
        createdByUserId: params.userId,
        duplicatedFromInvoiceId: params.duplicatedFromInvoiceId ?? null,
        duplicatedAt: params.duplicatedFromInvoiceId ? new Date() : null,
      },
    });

    await tx.invoiceLine.createMany({
      data: params.lines.map((line, index) =>
        buildLineCreateData(
          params.organizationId,
          invoice.id,
          line,
          index,
          line.productId ? products.get(line.productId) : undefined,
          totals.lineTotals[index]!,
        ),
      ),
    });

    return invoice;
  });
}

export async function updateDraftInvoiceWithLines(params: {
  organizationId: string;
  invoiceId: string;
  customerId?: string | null;
  invoiceDate: Date;
  dueDate?: Date | null;
  notes?: string | null;
  lines: InvoiceLineInput[];
}) {
  const products = await loadProducts(params.organizationId, params.lines);
  const purchaseRates = new Map(
    [...products.entries()].map(([id, p]) => [id, p.purchaseRateCents]),
  );
  const totals = calculateInvoiceTotals(params.lines, purchaseRates);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.update({
      where: { id: params.invoiceId },
      data: {
        customerId: params.customerId || null,
        invoiceDate: params.invoiceDate,
        dueDate: params.dueDate ?? null,
        subtotalCents: totals.subtotalCents,
        grandTotalCents: totals.grandTotalCents,
        totalProfitCents: totals.totalProfitCents,
        notes: params.notes?.trim() || null,
      },
    });

    await tx.invoiceLine.deleteMany({ where: { invoiceId: params.invoiceId } });
    await tx.invoiceLine.createMany({
      data: params.lines.map((line, index) =>
        buildLineCreateData(
          params.organizationId,
          params.invoiceId,
          line,
          index,
          line.productId ? products.get(line.productId) : undefined,
          totals.lineTotals[index]!,
        ),
      ),
    });

    return invoice;
  });
}

export async function issueInvoiceRecord(params: {
  organizationId: string;
  invoiceId: string;
  userId: string;
  customerId: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  notes?: string | null;
  lines: InvoiceLineInput[];
}) {
  const products = await loadProducts(params.organizationId, params.lines);
  const purchaseRates = new Map(
    [...products.entries()].map(([id, p]) => [id, p.purchaseRateCents]),
  );
  const totals = calculateInvoiceTotals(params.lines, purchaseRates);

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await allocateInvoiceNumber(tx, params.organizationId);
    const issuedAt = new Date();

    const invoice = await tx.invoice.update({
      where: { id: params.invoiceId },
      data: {
        customerId: params.customerId,
        invoiceNumber,
        status: "issued",
        invoiceDate: params.invoiceDate,
        dueDate: params.dueDate ?? null,
        issuedAt,
        issuedByUserId: params.userId,
        subtotalCents: totals.subtotalCents,
        grandTotalCents: totals.grandTotalCents,
        balanceDueCents: totals.grandTotalCents,
        amountPaidCents: BigInt(0),
        totalProfitCents: totals.totalProfitCents,
        notes: params.notes?.trim() || null,
      },
    });

    await tx.invoiceLine.deleteMany({ where: { invoiceId: params.invoiceId } });
    await tx.invoiceLine.createMany({
      data: params.lines.map((line, index) =>
        buildLineCreateData(
          params.organizationId,
          params.invoiceId,
          line,
          index,
          line.productId ? products.get(line.productId) : undefined,
          totals.lineTotals[index]!,
        ),
      ),
    });

    await tx.ledgerEntry.create({
      data: {
        organizationId: params.organizationId,
        entryDate: params.invoiceDate,
        entryType: "invoice",
        customerId: params.customerId,
        debitCents: totals.grandTotalCents,
        creditCents: BigInt(0),
        referenceLabel: invoiceNumber,
        memo: `Invoice ${invoiceNumber}`,
        sourceType: "invoice",
        sourceId: params.invoiceId,
        runningBalanceCents: totals.grandTotalCents,
      },
    });

    return invoice;
  });
}

export async function duplicateInvoiceRecord(params: {
  organizationId: string;
  sourceInvoiceId: string;
  userId: string;
}) {
  const source = await prisma.invoice.findFirst({
    where: { id: params.sourceInvoiceId, organizationId: params.organizationId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) return null;

  const builderTypes = new Set([
    "product",
    "transport",
    "loading_unloading",
    "custom",
  ]);
  const lines: InvoiceLineInput[] = source.lines
    .filter((line) => line.lineType !== "opening_balance")
    .map((line) => ({
      lineType: builderTypes.has(line.lineType)
        ? (line.lineType as InvoiceLineInput["lineType"])
        : "custom",
      productId: line.productId ?? "",
      description: line.description,
      quantity: Number(line.quantity),
      rate: Number(line.sellingRateCents) / 100,
      customChargeLabel: line.customChargeLabel ?? "",
    }));

  return createInvoiceWithLines({
    organizationId: params.organizationId,
    userId: params.userId,
    customerId: source.customerId,
    invoiceDate: source.invoiceDate ?? new Date(),
    dueDate: source.dueDate,
    notes: source.notes,
    lines,
    duplicatedFromInvoiceId: source.id,
  });
}
