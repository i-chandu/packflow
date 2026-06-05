"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWriteAction } from "@/lib/actions/action-context";
import { actionError, type ActionResult } from "@/lib/actions/action-result";
import { logAudit } from "@/lib/audit";
import { rupeesToCents } from "@/lib/money";
import { recordProductPriceHistory } from "@/lib/products/price-history";
import { productFormSchema } from "@/lib/validations/product";
import type { ProductFormInput } from "@/lib/validations/product";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type FormParseError = Extract<ActionResult<never>, { success: false }>;

function isFormParseError(
  value: ProductFormInput | FormParseError,
): value is FormParseError {
  return "success" in value && value.success === false;
}

function parseProductForm(formData: FormData): ProductFormInput | FormParseError {
  const result = productFormSchema.safeParse({
    name: formData.get("name"),
    lengthMm: formData.get("lengthMm"),
    widthMm: formData.get("widthMm"),
    heightMm: formData.get("heightMm"),
    ply: formData.get("ply") || "",
    gsm: formData.get("gsm") || "",
    supplierId: formData.get("supplierId") || "",
    purchaseRate: formData.get("purchaseRate"),
    sellingRate: formData.get("sellingRate"),
    notes: formData.get("notes") || "",
    status: formData.get("status") || "active",
  });
  if (!result.success) {
    return actionError(
      "Validation failed",
      result.error.flatten().fieldErrors,
    ) as FormParseError;
  }
  return result.data;
}

function revalidateProductPaths(orgSlug: string, productId?: string) {
  revalidatePath(`/${orgSlug}/products`);
  if (productId) {
    revalidatePath(`/${orgSlug}/products/${productId}`);
    revalidatePath(`/${orgSlug}/products/${productId}/edit`);
  }
}

function mapProductData(input: ProductFormInput) {
  return {
    name: input.name.trim(),
    lengthMm: new Prisma.Decimal(input.lengthMm),
    widthMm: new Prisma.Decimal(input.widthMm),
    heightMm: new Prisma.Decimal(input.heightMm),
    ply: input.ply?.trim() || null,
    gsm: input.gsm !== "" && input.gsm !== undefined ? new Prisma.Decimal(Number(input.gsm)) : null,
    supplierId: input.supplierId || null,
    purchaseRateCents: rupeesToCents(input.purchaseRate),
    sellingRateCents: rupeesToCents(input.sellingRate),
    notes: input.notes?.trim() || null,
    status: input.status as "active" | "inactive",
    archivedAt: input.status === "inactive" ? new Date() : null,
  };
}

export async function createProduct(orgSlug: string, formData: FormData) {
  let userId: string;
  let organizationId: string;

  try {
    const { userId: uid, ctx } = await requireWriteAction(orgSlug);
    userId = uid;
    organizationId = ctx.organization.id;

    const parsed = parseProductForm(formData);
    if (isFormParseError(parsed)) return parsed;
    const data = mapProductData(parsed);

    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, organizationId },
      });
      if (!supplier) return actionError("Supplier not found");
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        ...data,
        createdByUserId: userId,
        createdSource: "admin",
      },
    });

    await recordProductPriceHistory({
      organizationId,
      productId: product.id,
      purchaseRateCents: data.purchaseRateCents,
      sellingRateCents: data.sellingRateCents,
      changedByUserId: userId,
    });

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "product",
      entityId: product.id,
      action: "create",
      afterData: product,
    });

    revalidateProductPaths(orgSlug);
    redirect(`/${orgSlug}/products/${product.id}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to create products.");
    }
    if (e && typeof e === "object" && "issues" in e) {
      return actionError("Validation failed");
    }
    console.error(e);
    return actionError("Failed to create product");
  }
}

export async function updateProduct(
  orgSlug: string,
  productId: string,
  formData: FormData,
) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!existing) return actionError("Product not found");

    const parsed = parseProductForm(formData);
    if (isFormParseError(parsed)) return parsed;
    const data = mapProductData(parsed);

    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, organizationId },
      });
      if (!supplier) return actionError("Supplier not found");
    }

    const ratesChanged =
      existing.purchaseRateCents !== data.purchaseRateCents ||
      existing.sellingRateCents !== data.sellingRateCents;

    const product = await prisma.product.update({
      where: { id: productId },
      data,
    });

    if (ratesChanged) {
      await recordProductPriceHistory({
        organizationId,
        productId,
        purchaseRateCents: data.purchaseRateCents,
        sellingRateCents: data.sellingRateCents,
        changedByUserId: userId,
      });
    }

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "product",
      entityId: product.id,
      action: "update",
      beforeData: existing,
      afterData: product,
    });

    revalidateProductPaths(orgSlug, productId);
    redirect(`/${orgSlug}/products/${productId}`);
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to edit products.");
    }
    console.error(e);
    return actionError("Failed to update product");
  }
}

export async function deleteProduct(orgSlug: string, productId: string) {
  try {
    const { userId, ctx } = await requireWriteAction(orgSlug);
    const organizationId = ctx.organization.id;

    const existing = await prisma.product.findFirst({
      where: { id: productId, organizationId },
      include: { invoiceLines: { take: 1 } },
    });
    if (!existing) return actionError("Product not found");

    if (existing.invoiceLines.length > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: "inactive", archivedAt: new Date() },
      });
    } else {
      await prisma.productPriceHistory.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } });
    }

    await logAudit({
      organizationId,
      actorUserId: userId,
      entityType: "product",
      entityId: productId,
      action: "delete",
      beforeData: existing,
    });

    revalidateProductPaths(orgSlug);
    return { success: true as const };
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return actionError("You do not have permission to delete products.");
    }
    return actionError("Failed to delete product");
  }
}

function toProductFormState(result: ActionResult | void): ProductFormState {
  if (result && "success" in result && result.success === false) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }
  return {};
}

export async function createProductFormAction(
  orgSlug: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return toProductFormState(await createProduct(orgSlug, formData));
}

export async function updateProductFormAction(
  orgSlug: string,
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  return toProductFormState(await updateProduct(orgSlug, productId, formData));
}
