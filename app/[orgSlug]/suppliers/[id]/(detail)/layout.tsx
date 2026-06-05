import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getSupplierById } from "@/lib/queries/suppliers";
import { getSupplierPayableCents } from "@/lib/ledger/customer-balance";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { TabsNav } from "@/components/shared/tabs";
import { SupplierDeleteButton } from "@/components/suppliers/supplier-delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SupplierDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();

  const supplier = await getSupplierById(ctx.organization.id, id);
  if (!supplier) notFound();

  const payableCents = await getSupplierPayableCents(ctx.organization.id, id);
  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/suppliers/${id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        description={
          payableCents > BigInt(0)
            ? `Outstanding payable: ${formatINR(payableCents)}`
            : "No outstanding payables"
        }
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/edit`}>Edit</Link>
              </Button>
              <SupplierDeleteButton orgSlug={orgSlug} supplierId={id} />
            </div>
          ) : (
            <Badge variant={supplier.isActive ? "default" : "secondary"}>
              {supplier.isActive ? "Active" : "Inactive"}
            </Badge>
          )
        }
      />

      <TabsNav
        tabs={[
          { label: "Overview", href: basePath, exact: true },
          { label: "Bills", href: `${basePath}/bills` },
          { label: "Ledger", href: `${basePath}/ledger` },
        ]}
      />

      {children}
    </div>
  );
}
