"use client";

import { useRouter } from "next/navigation";
import { deleteCustomer } from "@/app/actions/customers";
import { DeleteDialog } from "@/components/shared/delete-dialog";

export function CustomerDeleteButton({
  orgSlug,
  customerId,
}: {
  orgSlug: string;
  customerId: string;
}) {
  const router = useRouter();

  return (
    <DeleteDialog
      title="Delete client?"
      description="If this client has invoices it will be deactivated instead of deleted."
      onConfirm={async () => {
        const result = await deleteCustomer(orgSlug, customerId);
        if (result && "success" in result && result.success) {
          router.push(`/${orgSlug}/clients`);
          router.refresh();
        }
      }}
    />
  );
}
