"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriteAction } from "@/lib/actions/action-context";
import { actionError } from "@/lib/actions/action-result";
import { logAudit } from "@/lib/audit";
import { supplierFormSchema } from "@/lib/validations/supplier";
import type { SupplierFormInput } from "@/lib/validations/supplier";
import type { ActionResult } from "@/lib/actions/action-result";

export type SupplierFormState = { error?: string };

type FormParseError = Extract<ActionResult<never>, { success: false }>;

function isFormParseError(
  value: SupplierFormInput | FormParseError,
): value is FormParseError {
  return "success" in value && value.success === false;
}

function parseSupplierForm(formData: FormData): SupplierFormInput | FormParseError {
  const result = supplierFormSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    postalCode: formData.get("postalCode") || "",
    gstin: formData.get("gstin") || "",
    notes: formData.get("notes") || "",
    isActive: formData.get("isActive") || "true",
  });
  if (!result.success) {
    return actionError(
      "Validation failed",
      result.error.flatten().fieldErrors,
    ) as FormParseError;
  }
  return result.data;
}

function revalidateSupplierPaths(orgSlug: string, supplierId?: string) {
  revalidatePath(`/${orgSlug}/suppliers`);
  if (supplierId) {
    revalidatePath(`/${orgSlug}/suppliers/${supplierId}`);
    revalidatePath(`/${orgSlug}/suppliers/${supplierId}/edit`);
    revalidatePath(`/${orgSlug}/suppliers/${supplierId}/ledger`);
  }
}

function mapSupplierData(input: SupplierFormInput) {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    addressLine1: input.addressLine1?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    postalCode: input.postalCode?.trim() || null,
    gstin: input.gstin?.trim() || null,
    notes: input.notes?.trim() || null,
    isActive: input.isActive !== "false",
  };
}

export async function createSupplier(orgSlug: string, formData: FormData) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;
    const parsed = parseSupplierForm(formData);
    if (isFormParseError(parsed)) return parsed;
    const data = mapSupplierData(parsed);

    const supplier = await prisma.supplier.create({
      data: { organizationId, ...data },
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "supplier",
      entityId: supplier.id,
      action: "create",
      afterData: supplier,
    });

    revalidateSupplierPaths(orgSlug);
    redirect(`/${orgSlug}/suppliers/${supplier.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to create suppliers.");
    }
    return actionError("Failed to create supplier");
  }
}

export async function updateSupplier(
  orgSlug: string,
  supplierId: string,
  formData: FormData,
) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.supplier.findFirst({
      where: { id: supplierId, organizationId },
    });
    if (!existing) return actionError("Supplier not found");

    const parsed = parseSupplierForm(formData);
    if (isFormParseError(parsed)) return parsed;

    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: mapSupplierData(parsed),
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "supplier",
      entityId: supplier.id,
      action: "update",
      beforeData: existing,
      afterData: supplier,
    });

    revalidateSupplierPaths(orgSlug, supplierId);
    redirect(`/${orgSlug}/suppliers/${supplierId}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to edit suppliers.");
    }
    return actionError("Failed to update supplier");
  }
}

export async function deleteSupplier(orgSlug: string, supplierId: string) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.supplier.findFirst({
      where: { id: supplierId, organizationId },
      include: { products: { take: 1 }, supplierBills: { take: 1 } },
    });
    if (!existing) return actionError("Supplier not found");

    if (existing.products.length > 0 || existing.supplierBills.length > 0) {
      await prisma.supplier.update({
        where: { id: supplierId },
        data: { isActive: false },
      });
    } else {
      await prisma.supplier.delete({ where: { id: supplierId } });
    }

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "supplier",
      entityId: supplierId,
      action: "delete",
      beforeData: existing,
    });

    revalidateSupplierPaths(orgSlug);
    return { success: true as const };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to delete suppliers.");
    }
    return actionError("Failed to delete supplier");
  }
}

function toSupplierFormState(
  result: ActionResult | { success: true } | undefined,
): SupplierFormState {
  if (result && "success" in result && result.success === false) {
    return { error: result.error };
  }
  return {};
}

export async function createSupplierFormAction(
  orgSlug: string,
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  return toSupplierFormState(await createSupplier(orgSlug, formData));
}

export async function updateSupplierFormAction(
  orgSlug: string,
  supplierId: string,
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  return toSupplierFormState(await updateSupplier(orgSlug, supplierId, formData));
}
