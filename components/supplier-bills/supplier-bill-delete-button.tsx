"use client";

import { useRouter } from "next/navigation";
import { deleteSupplierBill } from "@/app/actions/supplier-bills";
import { Button } from "@/components/ui/button";

export function SupplierBillDeleteButton({
  orgSlug,
  billId,
}: {
  orgSlug: string;
  billId: string;
}) {
  const router = useRouter();

  async function handleVoid() {
    if (!confirm("Void this supplier bill?")) return;
    const result = await deleteSupplierBill(orgSlug, billId);
    if (result.success) {
      router.push(`/${orgSlug}/supplier-bills/${billId}`);
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleVoid}>
      Void bill
    </Button>
  );
}
