"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWriteAction } from "@/lib/actions/action-context";
import { actionError } from "@/lib/actions/action-result";
import { logAudit } from "@/lib/audit";
import { rupeesToCents } from "@/lib/money";
import { customerFormSchema } from "@/lib/validations/customer";
import type { CustomerFormInput } from "@/lib/validations/customer";
import type { ActionResult } from "@/lib/actions/action-result";

export type CustomerFormState = { error?: string };

type FormParseError = Extract<ActionResult<never>, { success: false }>;

function isFormParseError(
  value: CustomerFormInput | FormParseError,
): value is FormParseError {
  return "success" in value && value.success === false;
}

function parseCustomerForm(formData: FormData): CustomerFormInput | FormParseError {
  const result = customerFormSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    addressLine1: formData.get("addressLine1") || "",
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city") || "",
    billingState: formData.get("billingState") || "",
    postalCode: formData.get("postalCode") || "",
    gstin: formData.get("gstin") || "",
    notes: formData.get("notes") || "",
    openingBalance: formData.get("openingBalance") || 0,
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

function revalidateCustomerPaths(orgSlug: string, customerId?: string) {
  revalidatePath(`/${orgSlug}/clients`);
  if (customerId) {
    revalidatePath(`/${orgSlug}/clients/${customerId}`);
    revalidatePath(`/${orgSlug}/clients/${customerId}/edit`);
    revalidatePath(`/${orgSlug}/clients/${customerId}/ledger`);
  }
}

function mapCustomerData(input: CustomerFormInput) {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    addressLine1: input.addressLine1?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    city: input.city?.trim() || null,
    billingState: input.billingState?.trim() || null,
    postalCode: input.postalCode?.trim() || null,
    gstin: input.gstin?.trim() || null,
    notes: input.notes?.trim() || null,
    isActive: input.isActive !== "false",
  };
}

export async function createCustomer(orgSlug: string, formData: FormData) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;
    const parsed = parseCustomerForm(formData);
    if (isFormParseError(parsed)) return parsed;
    const input = parsed;
    const openingCents = rupeesToCents(input.openingBalance ?? 0);

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          organizationId,
          ...mapCustomerData(input),
          createdByUserId: userId,
          createdSource: "admin",
        },
      });

      if (openingCents > BigInt(0)) {
        await tx.ledgerEntry.create({
          data: {
            organizationId,
            entryDate: new Date(),
            entryType: "adjustment",
            customerId: created.id,
            debitCents: openingCents,
            creditCents: BigInt(0),
            referenceLabel: "Opening balance",
            memo: "Opening balance on client creation",
            sourceType: "manual_adjustment",
            sourceId: created.id,
            runningBalanceCents: openingCents,
          },
        });
      }

      return created;
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "customer",
      entityId: customer.id,
      action: "create",
      afterData: customer,
    });

    revalidateCustomerPaths(orgSlug);
    redirect(`/${orgSlug}/clients/${customer.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to create clients.");
    }
    return actionError("Failed to create client");
  }
}

export async function updateCustomer(
  orgSlug: string,
  customerId: string,
  formData: FormData,
) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!existing) return actionError("Client not found");

    const parsed = parseCustomerForm(formData);
    if (isFormParseError(parsed)) return parsed;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: mapCustomerData(parsed),
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "customer",
      entityId: customer.id,
      action: "update",
      beforeData: existing,
      afterData: customer,
    });

    revalidateCustomerPaths(orgSlug, customerId);
    redirect(`/${orgSlug}/clients/${customerId}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to edit clients.");
    }
    return actionError("Failed to update client");
  }
}

export async function deleteCustomer(orgSlug: string, customerId: string) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      include: { invoices: { take: 1 } },
    });
    if (!existing) return actionError("Client not found");

    if (existing.invoices.length > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: false },
      });
    } else {
      await prisma.ledgerEntry.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } });
    }

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "customer",
      entityId: customerId,
      action: "delete",
      beforeData: existing,
    });

    revalidateCustomerPaths(orgSlug);
    return { success: true as const };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to delete clients.");
    }
    return actionError("Failed to delete client");
  }
}

function toCustomerFormState(
  result: ActionResult | { success: true } | undefined,
): CustomerFormState {
  if (result && "success" in result && result.success === false) {
    return { error: result.error };
  }
  return {};
}

export async function createCustomerFormAction(
  orgSlug: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  return toCustomerFormState(await createCustomer(orgSlug, formData));
}

export async function updateCustomerFormAction(
  orgSlug: string,
  customerId: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  return toCustomerFormState(await updateCustomer(orgSlug, customerId, formData));
}
