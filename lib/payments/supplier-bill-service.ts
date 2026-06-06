import { nextSupplierRunningBalanceCents } from "@/lib/ledger/running-balance";
import { rupeesToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { SupplierBillFormInput } from "@/lib/validations/supplier-bill";

export async function createSupplierBillRecord(params: {
  organizationId: string;
  input: SupplierBillFormInput;
}) {
  const amountCents = rupeesToCents(params.input.amount);
  const billDate = new Date(params.input.billDate);
  const dueDate = params.input.dueDate ? new Date(params.input.dueDate) : null;

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.input.supplierId, organizationId: params.organizationId },
  });
  if (!supplier) throw new Error("Supplier not found");

  const existing = await prisma.supplierBill.findFirst({
    where: {
      organizationId: params.organizationId,
      billNumber: params.input.billNumber.trim(),
    },
  });
  if (existing) throw new Error("Bill number already exists");

  return prisma.$transaction(async (tx) => {
    const bill = await tx.supplierBill.create({
      data: {
        organizationId: params.organizationId,
        supplierId: params.input.supplierId,
        billNumber: params.input.billNumber.trim(),
        reference: params.input.reference?.trim() || null,
        billDate,
        dueDate,
        status: "open",
        grandTotalCents: amountCents,
        amountPaidCents: BigInt(0),
        balanceDueCents: amountCents,
        notes: params.input.notes?.trim() || null,
      },
    });

    const runningBalance = await nextSupplierRunningBalanceCents(
      params.organizationId,
      params.input.supplierId,
      BigInt(0),
      amountCents,
      tx,
    );

    await tx.ledgerEntry.create({
      data: {
        organizationId: params.organizationId,
        entryDate: billDate,
        entryType: "supplier_bill",
        supplierId: params.input.supplierId,
        debitCents: BigInt(0),
        creditCents: amountCents,
        referenceLabel: bill.billNumber,
        memo: `Supplier bill ${bill.billNumber}`,
        sourceType: "supplier_bill",
        sourceId: bill.id,
        runningBalanceCents: runningBalance,
      },
    });

    return bill;
  });
}

export async function updateSupplierBillRecord(params: {
  organizationId: string;
  billId: string;
  input: SupplierBillFormInput;
}) {
  const amountCents = rupeesToCents(params.input.amount);
  const billDate = new Date(params.input.billDate);
  const dueDate = params.input.dueDate ? new Date(params.input.dueDate) : null;

  const existing = await prisma.supplierBill.findFirst({
    where: { id: params.billId, organizationId: params.organizationId },
    include: { allocations: { take: 1 } },
  });
  if (!existing) throw new Error("Bill not found");
  if (existing.allocations.length > 0 || existing.amountPaidCents > BigInt(0)) {
    throw new Error("Cannot edit bill with payments");
  }
  if (existing.status === "void") throw new Error("Cannot edit void bill");

  const duplicate = await prisma.supplierBill.findFirst({
    where: {
      organizationId: params.organizationId,
      billNumber: params.input.billNumber.trim(),
      NOT: { id: params.billId },
    },
  });
  if (duplicate) throw new Error("Bill number already exists");

  return prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.deleteMany({
      where: {
        organizationId: params.organizationId,
        sourceType: "supplier_bill",
        sourceId: params.billId,
      },
    });

    const bill = await tx.supplierBill.update({
      where: { id: params.billId },
      data: {
        supplierId: params.input.supplierId,
        billNumber: params.input.billNumber.trim(),
        reference: params.input.reference?.trim() || null,
        billDate,
        dueDate,
        grandTotalCents: amountCents,
        balanceDueCents: amountCents,
        notes: params.input.notes?.trim() || null,
      },
    });

    const runningBalance = await nextSupplierRunningBalanceCents(
      params.organizationId,
      params.input.supplierId,
      BigInt(0),
      amountCents,
      tx,
    );

    await tx.ledgerEntry.create({
      data: {
        organizationId: params.organizationId,
        entryDate: billDate,
        entryType: "supplier_bill",
        supplierId: params.input.supplierId,
        debitCents: BigInt(0),
        creditCents: amountCents,
        referenceLabel: bill.billNumber,
        memo: `Supplier bill ${bill.billNumber}`,
        sourceType: "supplier_bill",
        sourceId: bill.id,
        runningBalanceCents: runningBalance,
      },
    });

    return bill;
  });
}

export async function voidSupplierBill(params: {
  organizationId: string;
  billId: string;
}) {
  const existing = await prisma.supplierBill.findFirst({
    where: { id: params.billId, organizationId: params.organizationId },
    include: { allocations: { take: 1 } },
  });
  if (!existing) throw new Error("Bill not found");
  if (existing.allocations.length > 0 || existing.amountPaidCents > BigInt(0)) {
    throw new Error("Cannot void bill with payments");
  }

  return prisma.$transaction(async (tx) => {
    const bill = await tx.supplierBill.update({
      where: { id: params.billId },
      data: {
        status: "void",
        balanceDueCents: BigInt(0),
      },
    });

    await tx.ledgerEntry.deleteMany({
      where: {
        organizationId: params.organizationId,
        sourceType: "supplier_bill",
        sourceId: params.billId,
      },
    });

    const runningBalance = await nextSupplierRunningBalanceCents(
      params.organizationId,
      existing.supplierId,
      existing.grandTotalCents,
      BigInt(0),
      tx,
    );

    await tx.ledgerEntry.create({
      data: {
        organizationId: params.organizationId,
        entryDate: new Date(),
        entryType: "adjustment",
        supplierId: existing.supplierId,
        debitCents: existing.grandTotalCents,
        creditCents: BigInt(0),
        referenceLabel: existing.billNumber,
        memo: `Voided supplier bill ${existing.billNumber}`,
        sourceType: "supplier_bill",
        sourceId: existing.id,
        runningBalanceCents: runningBalance,
      },
    });

    return bill;
  });
}
