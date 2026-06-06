"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireWriteAction } from "@/lib/actions/action-context";
import { actionError, type ActionResult } from "@/lib/actions/action-result";
import { logAudit } from "@/lib/audit";
import {
  createSupplierBillRecord,
  updateSupplierBillRecord,
  voidSupplierBill,
} from "@/lib/payments/supplier-bill-service";
import { formDataToSupplierBillInput } from "@/lib/validations/supplier-bill";

export type SupplierBillFormState = { error?: string };

function revalidateBillPaths(orgSlug: string, billId?: string, supplierId?: string) {
  revalidatePath(`/${orgSlug}/supplier-bills`);
  revalidatePath(`/${orgSlug}/suppliers`);
  if (supplierId) {
    revalidatePath(`/${orgSlug}/suppliers/${supplierId}`);
    revalidatePath(`/${orgSlug}/suppliers/${supplierId}/bills`);
    revalidatePath(`/${orgSlug}/suppliers/${supplierId}/ledger`);
  }
  if (billId) {
    revalidatePath(`/${orgSlug}/supplier-bills/${billId}`);
    revalidatePath(`/${orgSlug}/supplier-bills/${billId}/edit`);
  }
}

export async function createSupplierBill(
  orgSlug: string,
  _prev: SupplierBillFormState,
  formData: FormData,
): Promise<SupplierBillFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const input = formDataToSupplierBillInput(formData);

    const bill = await createSupplierBillRecord({
      organizationId: ctx.organization.id,
      input,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "supplier_bill",
      entityId: bill.id,
      action: "create",
      afterData: bill,
    });

    revalidateBillPaths(orgSlug, bill.id, bill.supplierId);
    redirect(`/${orgSlug}/supplier-bills/${bill.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to create bills." };
    }
    return { error: e instanceof Error ? e.message : "Failed to create bill" };
  }
}

export async function updateSupplierBill(
  orgSlug: string,
  billId: string,
  _prev: SupplierBillFormState,
  formData: FormData,
): Promise<SupplierBillFormState> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const input = formDataToSupplierBillInput(formData);

    const bill = await updateSupplierBillRecord({
      organizationId: ctx.organization.id,
      billId,
      input,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "supplier_bill",
      entityId: bill.id,
      action: "update",
      afterData: bill,
    });

    revalidateBillPaths(orgSlug, bill.id, bill.supplierId);
    redirect(`/${orgSlug}/supplier-bills/${bill.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
    if (e instanceof Error && e.message === "Forbidden") {
      return { error: "You do not have permission to edit bills." };
    }
    return { error: e instanceof Error ? e.message : "Failed to update bill" };
  }
}

export async function deleteSupplierBill(
  orgSlug: string,
  billId: string,
): Promise<ActionResult> {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);

    const bill = await voidSupplierBill({
      organizationId: ctx.organization.id,
      billId,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "supplier_bill",
      entityId: billId,
      action: "void",
      afterData: bill,
    });

    revalidateBillPaths(orgSlug, billId, bill.supplierId);
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to void bills.");
    }
    return actionError(e instanceof Error ? e.message : "Failed to void bill");
  }
}
