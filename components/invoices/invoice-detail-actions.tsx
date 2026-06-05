"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelInvoice, duplicateInvoice, deleteInvoiceDraft } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@prisma/client";

export function InvoiceDetailActions({
  orgSlug,
  invoiceId,
  status,
  canWrite,
  canManage,
}: {
  orgSlug: string;
  invoiceId: string;
  status: InvoiceStatus;
  canWrite: boolean;
  canManage: boolean;
}) {
  const router = useRouter();

  async function handleDuplicate() {
    const result = await duplicateInvoice(orgSlug, invoiceId);
    if (result.success && result.data) {
      router.push(`/${orgSlug}/invoices/${result.data.id}/edit`);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this draft invoice?")) return;
    const result = await deleteInvoiceDraft(orgSlug, invoiceId);
    if (result.success) {
      router.push(`/${orgSlug}/invoices`);
      router.refresh();
    }
  }

  async function handleCancel() {
    const reason = prompt("Cancellation reason:");
    if (!reason?.trim()) return;
    const result = await cancelInvoice(orgSlug, invoiceId, reason);
    if (result.success) router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && canWrite && (
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/invoices/${invoiceId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete draft
          </Button>
        </>
      )}
      {status !== "draft" && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${orgSlug}/invoices/${invoiceId}/pdf`} target="_blank">
            Download PDF
          </Link>
        </Button>
      )}
      {canWrite && status !== "draft" && (
        <Button variant="outline" size="sm" onClick={handleDuplicate}>
          Duplicate
        </Button>
      )}
      {canWrite && (status === "issued" || status === "partially_paid") && (
        <Button size="sm" asChild>
          <Link href={`/${orgSlug}/payments/new?invoiceId=${invoiceId}`}>
            Record payment
          </Link>
        </Button>
      )}
      {canManage && status === "issued" && (
        <Button variant="destructive" size="sm" onClick={handleCancel}>
          Cancel invoice
        </Button>
      )}
    </div>
  );
}
