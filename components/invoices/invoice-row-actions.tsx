"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { duplicateInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InvoiceStatus } from "@prisma/client";

export function InvoiceRowActions({
  orgSlug,
  invoiceId,
  status,
  canWrite,
}: {
  orgSlug: string;
  invoiceId: string;
  status: InvoiceStatus;
  canWrite: boolean;
}) {
  const router = useRouter();
  const base = `/${orgSlug}/invoices/${invoiceId}`;

  async function handleDuplicate() {
    const result = await duplicateInvoice(orgSlug, invoiceId);
    if (result.success && result.data) {
      router.push(`/${orgSlug}/invoices/${result.data.id}/edit`);
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={base}>View</Link>
        </DropdownMenuItem>
        {canWrite && status === "draft" && (
          <DropdownMenuItem asChild>
            <Link href={`${base}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
        {canWrite && (
          <DropdownMenuItem onClick={handleDuplicate}>Duplicate</DropdownMenuItem>
        )}
        {status !== "draft" && (
          <DropdownMenuItem asChild>
            <Link href={`${base}/pdf`} target="_blank">
              PDF
            </Link>
          </DropdownMenuItem>
        )}
        {canWrite && status !== "draft" && status !== "cancelled" && (
          <DropdownMenuItem asChild>
            <Link href={`/${orgSlug}/payments/new?invoiceId=${invoiceId}`}>
              Record payment
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
