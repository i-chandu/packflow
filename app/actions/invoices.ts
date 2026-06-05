"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWriteAction, requireOrgAction } from "@/lib/actions/action-context";
import { actionError, type ActionResult } from "@/lib/actions/action-result";
import { logAudit } from "@/lib/audit";
import { canManageOrg } from "@/lib/org/permissions";
import {
  createInvoiceWithLines,
  duplicateInvoiceRecord,
  issueInvoiceRecord,
  updateDraftInvoiceWithLines,
} from "@/lib/invoices/invoice-service";
import { deriveInvoiceStatusFromPayments } from "@/lib/invoices/payment-status";
import { formDataToInvoiceInput } from "@/lib/validations/invoice";

export type InvoiceFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function revalidateInvoicePaths(orgSlug: string, invoiceId?: string) {
  revalidatePath(`/${orgSlug}/invoices`);
  revalidatePath(`/${orgSlug}`);
  if (invoiceId) {
    revalidatePath(`/${orgSlug}/invoices/${invoiceId}`);
    revalidatePath(`/${orgSlug}/invoices/${invoiceId}/edit`);
    revalidatePath(`/${orgSlug}/invoices/${invoiceId}/pdf`);
  }
}

function parseDates(input: { invoiceDate: string; dueDate?: string }) {
  return {
    invoiceDate: new Date(input.invoiceDate),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  };
}

function zodToFormState(error: ZodError): InvoiceFormState {
  return {
    error: "Validation failed",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

export async function createAndIssueInvoice(
  orgSlug: string,
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const input = formDataToInvoiceInput(formData, true);
    const dates = parseDates(input);

    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) return { error: "Client not found" };

    const customerId = input.customerId as string;

    const draft = await createInvoiceWithLines({
      organizationId,
      userId,
      customerId,
      invoiceDate: dates.invoiceDate,
      dueDate: dates.dueDate,
      notes: input.notes,
      lines: input.lines,
    });

    const invoice = await issueInvoiceRecord({
      organizationId,
      invoiceId: draft.id,
      userId,
      customerId,
      invoiceDate: dates.invoiceDate,
      dueDate: dates.dueDate,
      notes: input.notes,
      lines: input.lines,
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "issue",
      afterData: invoice,
    });

    revalidateInvoicePaths(orgSlug, invoice.id);
    redirect(`/${orgSlug}/invoices/${invoice.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) return zodToFormState(e);
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to issue invoices." };
    }
    console.error(e);
    return { error: "Failed to issue invoice" };
  }
}

export async function createInvoiceDraft(
  orgSlug: string,
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const input = formDataToInvoiceInput(formData, false);
    const dates = parseDates(input);

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, organizationId },
      });
      if (!customer) return { error: "Client not found" };
    }

    const invoice = await createInvoiceWithLines({
      organizationId,
      userId,
      customerId: input.customerId || null,
      invoiceDate: dates.invoiceDate,
      dueDate: dates.dueDate,
      notes: input.notes,
      lines: input.lines,
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "create",
      afterData: invoice,
    });

    revalidateInvoicePaths(orgSlug, invoice.id);
    redirect(`/${orgSlug}/invoices/${invoice.id}/edit`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) return zodToFormState(e);
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to create invoices." };
    }
    console.error(e);
    return { error: "Failed to save draft" };
  }
}

export async function updateInvoiceDraft(
  orgSlug: string,
  invoiceId: string,
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!existing) return { error: "Invoice not found" };
    if (existing.status !== "draft") {
      return { error: "Only draft invoices can be edited" };
    }

    const input = formDataToInvoiceInput(formData, false);
    const dates = parseDates(input);

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, organizationId },
      });
      if (!customer) return { error: "Client not found" };
    }

    const invoice = await updateDraftInvoiceWithLines({
      organizationId,
      invoiceId,
      customerId: input.customerId || null,
      invoiceDate: dates.invoiceDate,
      dueDate: dates.dueDate,
      notes: input.notes,
      lines: input.lines,
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "update",
      beforeData: existing,
      afterData: invoice,
    });

    revalidateInvoicePaths(orgSlug, invoiceId);
    return {};
  } catch (e) {
    if (e instanceof ZodError) return zodToFormState(e);
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to edit invoices." };
    }
    console.error(e);
    return { error: "Failed to update draft" };
  }
}

export async function issueInvoice(
  orgSlug: string,
  invoiceId: string,
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!existing) return { error: "Invoice not found" };
    if (existing.status !== "draft") {
      return { error: "Only draft invoices can be issued" };
    }

    const input = formDataToInvoiceInput(formData, true);
    const dates = parseDates(input);

    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) return { error: "Client not found" };

    const customerId = input.customerId as string;

    const invoice = await issueInvoiceRecord({
      organizationId,
      invoiceId,
      userId,
      customerId,
      invoiceDate: dates.invoiceDate,
      dueDate: dates.dueDate,
      notes: input.notes,
      lines: input.lines,
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "issue",
      beforeData: existing,
      afterData: invoice,
    });

    revalidateInvoicePaths(orgSlug, invoiceId);
    redirect(`/${orgSlug}/invoices/${invoiceId}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) return zodToFormState(e);
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to issue invoices." };
    }
    console.error(e);
    return { error: "Failed to issue invoice" };
  }
}

export async function duplicateInvoice(
  orgSlug: string,
  invoiceId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const duplicate = await duplicateInvoiceRecord({
      organizationId,
      sourceInvoiceId: invoiceId,
      userId,
    });
    if (!duplicate) return actionError("Invoice not found");

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: duplicate.id,
      action: "create",
      afterData: { duplicatedFrom: invoiceId },
    });

    revalidateInvoicePaths(orgSlug, duplicate.id);
    return { success: true, data: { id: duplicate.id } };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to duplicate invoices.");
    }
    return actionError("Failed to duplicate invoice");
  }
}

export async function cancelInvoice(
  orgSlug: string,
  invoiceId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { userId, ctx } = await requireOrgAction(orgSlug);
    if (!canManageOrg(ctx.membership.role)) {
      return actionError("Only admins can cancel invoices.");
    }

    const organizationId = ctx.organization.id;
    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { allocations: { take: 1 } },
    });
    if (!existing) return actionError("Invoice not found");
    if (existing.status === "cancelled") return actionError("Already cancelled");
    if (existing.status === "draft") return actionError("Delete draft instead");
    if (existing.allocations.length > 0 || existing.amountPaidCents > BigInt(0)) {
      return actionError("Cannot cancel invoice with payments");
    }
    if (!reason.trim()) return actionError("Cancellation reason is required");

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByUserId: userId,
        cancellationReason: reason.trim(),
        balanceDueCents: BigInt(0),
      },
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "cancel",
      beforeData: existing,
      afterData: invoice,
    });

    revalidateInvoicePaths(orgSlug, invoiceId);
    return { success: true };
  } catch {
    return actionError("Failed to cancel invoice");
  }
}

export async function deleteInvoiceDraft(
  orgSlug: string,
  invoiceId: string,
): Promise<ActionResult> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!existing) return actionError("Invoice not found");
    if (existing.status !== "draft") {
      return actionError("Only draft invoices can be deleted");
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "delete",
      beforeData: existing,
    });

    revalidateInvoicePaths(orgSlug);
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to delete invoices.");
    }
    return actionError("Failed to delete draft");
  }
}

export async function quickCreateClient(
  orgSlug: string,
  name: string,
  phone?: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    if (!name.trim()) return actionError("Name is required");

    const customer = await prisma.customer.create({
      data: {
        organizationId: ctx.organization.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        createdByUserId: userId,
        createdSource: "invoice_builder",
      },
    });

    revalidatePath(`/${orgSlug}/clients`);
    return { success: true, data: { id: customer.id, name: customer.name } };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("Permission denied");
    }
    return actionError("Failed to create client");
  }
}

export async function quickCreateProduct(
  orgSlug: string,
  data: {
    name: string;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    sellingRate: number;
    purchaseRate: number;
  },
): Promise<ActionResult<{ id: string; name: string; sellingRateCents: bigint }>> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const { Prisma } = await import("@prisma/client");
    const { rupeesToCents } = await import("@/lib/money");
    const { recordProductPriceHistory } = await import("@/lib/products/price-history");

    if (!data.name.trim()) return actionError("Name is required");

    const purchaseRateCents = rupeesToCents(data.purchaseRate);
    const sellingRateCents = rupeesToCents(data.sellingRate);

    const product = await prisma.product.create({
      data: {
        organizationId: ctx.organization.id,
        name: data.name.trim(),
        lengthMm: new Prisma.Decimal(data.lengthMm),
        widthMm: new Prisma.Decimal(data.widthMm),
        heightMm: new Prisma.Decimal(data.heightMm),
        purchaseRateCents,
        sellingRateCents,
        createdByUserId: userId,
        createdSource: "invoice_builder",
      },
    });

    await recordProductPriceHistory({
      organizationId: ctx.organization.id,
      productId: product.id,
      purchaseRateCents,
      sellingRateCents,
      changedByUserId: userId,
    });

    revalidatePath(`/${orgSlug}/products`);
    return {
      success: true,
      data: { id: product.id, name: product.name, sellingRateCents },
    };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("Permission denied");
    }
    return actionError("Failed to create product");
  }
}

/** Recompute status from payment allocations (for payment module integration). */
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
