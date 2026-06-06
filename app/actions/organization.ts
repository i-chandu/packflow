"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgAction } from "@/lib/actions/action-context";
import { logAudit } from "@/lib/audit";
import { canManageOrg } from "@/lib/org/permissions";
import { formDataToOrganizationInput } from "@/lib/validations/organization";

export type OrganizationFormState = { error?: string };

function mapOrganizationData(input: ReturnType<typeof formDataToOrganizationInput>) {
  return {
    name: input.name.trim(),
    legalName: input.legalName?.trim() || null,
    gstin: input.gstin?.trim() || null,
    invoicePrefix: input.invoicePrefix.trim().toUpperCase(),
    logoUrl: input.logoUrl?.trim() || null,
    addressLine1: input.addressLine1?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    postalCode: input.postalCode?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    upiId: input.upiId?.trim() || null,
    bankName: input.bankName?.trim() || null,
    bankAccountName: input.bankAccountName?.trim() || null,
    bankAccountNo: input.bankAccountNo?.trim() || null,
    bankIfsc: input.bankIfsc?.trim() || null,
    invoiceTerms: input.invoiceTerms?.trim() || null,
  };
}

export async function updateOrganization(
  orgSlug: string,
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  try {
    const { userId, ctx } = await requireOrgAction(orgSlug);
    if (!canManageOrg(ctx.membership.role)) {
      return { error: "Only admins can update organization settings." };
    }

    const input = formDataToOrganizationInput(formData);
    const data = mapOrganizationData(input);

    const organization = await prisma.organization.update({
      where: { id: ctx.organization.id },
      data,
    });

    await logAudit({
      organizationId: ctx.organization.id,
      actorUserId: userId,
      entityType: "organization",
      entityId: organization.id,
      action: "update",
      afterData: organization,
    });

    revalidatePath(`/${orgSlug}/settings/org`);
    revalidatePath(`/${orgSlug}/invoices`);
    return {};
  } catch (e) {
    if (e instanceof ZodError) {
      return { error: e.issues[0]?.message ?? "Validation failed" };
    }
    return { error: "Failed to update organization" };
  }
}
