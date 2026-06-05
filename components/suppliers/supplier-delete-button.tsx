"use client";

import { useRouter } from "next/navigation";
import { deleteSupplier } from "@/app/actions/suppliers";
import { DeleteDialog } from "@/components/shared/delete-dialog";

export function SupplierDeleteButton({
  orgSlug,
  supplierId,
}: {
  orgSlug: string;
  supplierId: string;
}) {
  const router = useRouter();

  return (
    <DeleteDialog
      title="Delete supplier?"
      description="If this supplier has products or bills it will be deactivated instead of deleted."
      onConfirm={async () => {
        const result = await deleteSupplier(orgSlug, supplierId);
        if (result && "success" in result && result.success) {
          router.push(`/${orgSlug}/suppliers`);
          router.refresh();
        }
      }}
    />
  );
}
