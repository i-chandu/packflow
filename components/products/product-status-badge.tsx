import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "@prisma/client";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge variant={status === "active" ? "success" : "secondary"}>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}
