import type { Prisma } from "@prisma/client";
import { syncInvoicePaymentStatus } from "@/lib/invoices/payment-sync";
import { nextCustomerRunningBalanceCents, nextSupplierRunningBalanceCents } from "@/lib/ledger/running-balance";
import { syncSupplierBillAmounts } from "@/lib/payments/supplier-bill-status";
import { rupeesToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { InboundPaymentInput, OutboundPaymentInput } from "@/lib/validations/payment";

type Tx = Prisma.TransactionClient;

export async function syncSupplierBillPaymentStatus(
  organizationId: string,
  supplierBillId: string,
  tx?: Tx,
) {
  const db = tx ?? prisma;
  const bill = await db.supplierBill.findFirst({
    where: { id: supplierBillId, organizationId },
  });
  if (!bill || bill.status === "void") return;

  const allocSum = await db.paymentAllocation.aggregate({
    where: { supplierBillId },
    _sum: { amountCents: true },
  });
  const amountPaidCents = allocSum._sum.amountCents ?? BigInt(0);
  const { balanceDueCents, status } = syncSupplierBillAmounts({
    grandTotalCents: bill.grandTotalCents,
    amountPaidCents,
  });

  await db.supplierBill.update({
    where: { id: supplierBillId },
    data: { amountPaidCents, balanceDueCents, status },
  });
}

export async function recordInboundPayment(params: {
  organizationId: string;
  userId: string;
  input: InboundPaymentInput;
}) {
  const amountCents = rupeesToCents(params.input.amount);
  const paymentDate = new Date(params.input.paymentDate);

  const customer = await prisma.customer.findFirst({
    where: { id: params.input.customerId, organizationId: params.organizationId },
  });
  if (!customer) throw new Error("Client not found");

  const invoiceId = params.input.invoiceId || null;
  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: params.organizationId,
        customerId: params.input.customerId,
      },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "draft" || invoice.status === "cancelled") {
      throw new Error("Cannot allocate payment to this invoice");
    }
    if (amountCents > invoice.balanceDueCents) {
      throw new Error("Payment exceeds invoice balance due");
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        organizationId: params.organizationId,
        direction: "inbound",
        partyType: "customer",
        customerId: params.input.customerId,
        paymentDate,
        amountCents,
        allocatedCents: invoiceId ? amountCents : BigInt(0),
        method: params.input.method,
        reference: params.input.reference?.trim() || null,
        notes: params.input.notes?.trim() || null,
        status: "cleared",
        recordedByUserId: params.userId,
      },
    });

    if (invoiceId) {
      await tx.paymentAllocation.create({
        data: {
          organizationId: params.organizationId,
          paymentId: created.id,
          invoiceId,
          amountCents,
          createdByUserId: params.userId,
        },
      });
    }

    const runningBalance = await nextCustomerRunningBalanceCents(
      params.organizationId,
      params.input.customerId,
      BigInt(0),
      amountCents,
      tx,
    );

    await tx.ledgerEntry.create({
      data: {
        organizationId: params.organizationId,
        entryDate: paymentDate,
        entryType: "payment",
        customerId: params.input.customerId,
        debitCents: BigInt(0),
        creditCents: amountCents,
        referenceLabel: params.input.reference?.trim() || created.id.slice(0, 8),
        memo: invoiceId
          ? `Payment received (allocated)`
          : `Payment received (unallocated)`,
        sourceType: "payment",
        sourceId: created.id,
        runningBalanceCents: runningBalance,
      },
    });

    return created;
  });

  if (invoiceId) {
    await syncInvoicePaymentStatus(params.organizationId, invoiceId);
  }

  return payment;
}

export async function recordOutboundPayment(params: {
  organizationId: string;
  userId: string;
  input: OutboundPaymentInput;
}) {
  const amountCents = rupeesToCents(params.input.amount);
  const paymentDate = new Date(params.input.paymentDate);

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.input.supplierId, organizationId: params.organizationId },
  });
  if (!supplier) throw new Error("Supplier not found");

  const supplierBillId = params.input.supplierBillId || null;
  if (supplierBillId) {
    const bill = await prisma.supplierBill.findFirst({
      where: {
        id: supplierBillId,
        organizationId: params.organizationId,
        supplierId: params.input.supplierId,
      },
    });
    if (!bill) throw new Error("Supplier bill not found");
    if (bill.status === "void" || bill.status === "paid") {
      throw new Error("Cannot allocate payment to this bill");
    }
    if (amountCents > bill.balanceDueCents) {
      throw new Error("Payment exceeds bill balance due");
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        organizationId: params.organizationId,
        direction: "outbound",
        partyType: "supplier",
        supplierId: params.input.supplierId,
        paymentDate,
        amountCents,
        allocatedCents: supplierBillId ? amountCents : BigInt(0),
        method: params.input.method,
        reference: params.input.reference?.trim() || null,
        notes: params.input.notes?.trim() || null,
        status: "cleared",
        recordedByUserId: params.userId,
      },
    });

    if (supplierBillId) {
      await tx.paymentAllocation.create({
        data: {
          organizationId: params.organizationId,
          paymentId: created.id,
          supplierBillId,
          amountCents,
          createdByUserId: params.userId,
        },
      });
    }

    const runningBalance = await nextSupplierRunningBalanceCents(
      params.organizationId,
      params.input.supplierId,
      amountCents,
      BigInt(0),
      tx,
    );

    await tx.ledgerEntry.create({
      data: {
        organizationId: params.organizationId,
        entryDate: paymentDate,
        entryType: "supplier_payment",
        supplierId: params.input.supplierId,
        debitCents: amountCents,
        creditCents: BigInt(0),
        referenceLabel: params.input.reference?.trim() || created.id.slice(0, 8),
        memo: supplierBillId
          ? `Supplier payment (allocated)`
          : `Supplier payment (unallocated)`,
        sourceType: "payment",
        sourceId: created.id,
        runningBalanceCents: runningBalance,
      },
    });

    return created;
  });

  if (supplierBillId) {
    await syncSupplierBillPaymentStatus(params.organizationId, supplierBillId);
  }

  return payment;
}

export async function deletePayment(params: {
  organizationId: string;
  paymentId: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { id: params.paymentId, organizationId: params.organizationId },
    include: { allocations: true },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "reversed") throw new Error("Payment already reversed");

  const snapshot = { ...payment };

  const invoiceIds = payment.allocations
    .map((a) => a.invoiceId)
    .filter((id): id is string => Boolean(id));
  const billIds = payment.allocations
    .map((a) => a.supplierBillId)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
    await tx.ledgerEntry.deleteMany({
      where: {
        organizationId: params.organizationId,
        sourceType: "payment",
        sourceId: payment.id,
      },
    });
    await tx.payment.delete({ where: { id: payment.id } });
  });

  for (const invoiceId of invoiceIds) {
    await syncInvoicePaymentStatus(params.organizationId, invoiceId);
  }
  for (const billId of billIds) {
    await syncSupplierBillPaymentStatus(params.organizationId, billId);
  }

  return snapshot;
}
