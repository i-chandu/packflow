"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireWriteAction } from "@/lib/actions/action-context";
import { actionError, type ActionResult } from "@/lib/actions/action-result";
import { logAudit } from "@/lib/audit";
import {
  deletePayment,
  recordInboundPayment,
  recordOutboundPayment,
} from "@/lib/payments/payment-service";
import {
  formDataToInboundPayment,
  formDataToOutboundPayment,
} from "@/lib/validations/payment";

export type PaymentFormState = { error?: string };

function revalidatePaymentPaths(orgSlug: string, paymentId?: string) {
  revalidatePath(`/${orgSlug}/payments`);
  revalidatePath(`/${orgSlug}`);
  revalidatePath(`/${orgSlug}/invoices`);
  revalidatePath(`/${orgSlug}/clients`);
  revalidatePath(`/${orgSlug}/suppliers`);
  if (paymentId) {
    revalidatePath(`/${orgSlug}/payments/${paymentId}`);
  }
}

export async function createInboundPayment(
  orgSlug: string,
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const input = formDataToInboundPayment(formData);

    const payment = await recordInboundPayment({
      organizationId: ctx.organization.id,
      userId,
      input,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "payment",
      entityId: payment.id,
      action: "create",
      afterData: payment,
    });

    revalidatePaymentPaths(orgSlug, payment.id);
    if (input.invoiceId) {
      revalidatePath(`/${orgSlug}/invoices/${input.invoiceId}`);
    }
    redirect(`/${orgSlug}/payments/${payment.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to record payments." };
    }
    return { error: e instanceof Error ? e.message : "Failed to record payment" };
  }
}

export async function createOutboundPayment(
  orgSlug: string,
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const input = formDataToOutboundPayment(formData);

    const payment = await recordOutboundPayment({
      organizationId: ctx.organization.id,
      userId,
      input,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "payment",
      entityId: payment.id,
      action: "create",
      afterData: payment,
    });

    revalidatePaymentPaths(orgSlug, payment.id);
    if (input.supplierBillId) {
      revalidatePath(`/${orgSlug}/supplier-bills/${input.supplierBillId}`);
    }
    revalidatePath(`/${orgSlug}/suppliers/${input.supplierId}`);
    redirect(`/${orgSlug}/payments/${payment.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to record payments." };
    }
    return { error: e instanceof Error ? e.message : "Failed to record payment" };
  }
}

export async function removePayment(
  orgSlug: string,
  paymentId: string,
): Promise<ActionResult> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);

    const existing = await deletePayment({
      organizationId: ctx.organization.id,
      paymentId,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "payment",
      entityId: paymentId,
      action: "delete",
      beforeData: existing,
    });

    revalidatePaymentPaths(orgSlug);
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to delete payments.");
    }
    return actionError(e instanceof Error ? e.message : "Failed to delete payment");
  }
}
