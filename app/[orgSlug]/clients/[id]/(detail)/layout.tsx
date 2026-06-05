import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getCustomerById } from "@/lib/queries/customers";
import { canWriteOperations } from "@/lib/org/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/shared/page-header";
import { TabsNav } from "@/components/shared/tabs";
import { CustomerDeleteButton } from "@/components/clients/customer-delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ClientDetailLayout({
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

  const customer = await getCustomerById(ctx.organization.id, id);
  if (!customer) notFound();

  const canWrite = canWriteOperations(ctx.membership.role);
  const basePath = `/${orgSlug}/clients/${id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={
          customer.outstandingCents > BigInt(0)
            ? `Outstanding balance: ${formatINR(customer.outstandingCents)}`
            : "No outstanding balance"
        }
        actions={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Badge variant={customer.isActive ? "default" : "secondary"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/edit`}>Edit</Link>
              </Button>
              <CustomerDeleteButton orgSlug={orgSlug} customerId={id} />
            </div>
          ) : (
            <Badge variant={customer.isActive ? "default" : "secondary"}>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
          )
        }
      />

      <TabsNav
        tabs={[
          { label: "Overview", href: basePath, exact: true },
          { label: "Ledger", href: `${basePath}/ledger` },
        ]}
      />

      {children}
    </div>
  );
}
