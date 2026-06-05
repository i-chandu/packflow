"use client";

import { useRouter } from "next/navigation";
import { deleteProduct } from "@/app/actions/products";
import { DeleteDialog } from "@/components/shared/delete-dialog";

export function ProductDeleteButton({
  orgSlug,
  productId,
}: {
  orgSlug: string;
  productId: string;
}) {
  const router = useRouter();

  return (
    <DeleteDialog
      title="Delete product?"
      description="If this product is used on invoices it will be deactivated instead of deleted."
      onConfirm={async () => {
        const result = await deleteProduct(orgSlug, productId);
        if (result && "success" in result && result.success) {
          router.push(`/${orgSlug}/products`);
          router.refresh();
        }
      }}
    />
  );
}
