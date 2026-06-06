"use client";

import { useRouter } from "next/navigation";
import { removePayment } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";

export function PaymentDeleteButton({
  orgSlug,
  paymentId,
}: {
  orgSlug: string;
  paymentId: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this payment? Invoice and bill balances will be recalculated.")) {
      return;
    }
    const result = await removePayment(orgSlug, paymentId);
    if (result.success) {
      router.push(`/${orgSlug}/payments`);
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete}>
      Delete payment
    </Button>
  );
}
