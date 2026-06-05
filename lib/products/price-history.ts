import type { PriceChangeSource, PriceRateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordProductPriceHistory(params: {
  organizationId: string;
  productId: string;
  purchaseRateCents: bigint;
  sellingRateCents: bigint;
  changedByUserId?: string;
  changeSource?: PriceChangeSource;
}) {
  const now = new Date();
  const changeSource = params.changeSource ?? "manual";

  for (const rateType of ["purchase", "selling"] as PriceRateType[]) {
    const amountCents =
      rateType === "purchase"
        ? params.purchaseRateCents
        : params.sellingRateCents;

    await prisma.productPriceHistory.updateMany({
      where: {
        productId: params.productId,
        rateType,
        validTo: null,
      },
      data: { validTo: now },
    });

    await prisma.productPriceHistory.create({
      data: {
        organizationId: params.organizationId,
        productId: params.productId,
        rateType,
        amountCents,
        validFrom: now,
        changedByUserId: params.changedByUserId,
        changeSource,
      },
    });
  }
}

export async function closeProductPriceHistory(productId: string) {
  await prisma.productPriceHistory.updateMany({
    where: { productId, validTo: null },
    data: { validTo: new Date() },
  });
}
