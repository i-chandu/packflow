import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@prisma/client";

const LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
};

const VARIANTS: Record<
  InvoiceStatus,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  issued: "default",
  partially_paid: "warning",
  paid: "success",
  cancelled: "destructive",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
