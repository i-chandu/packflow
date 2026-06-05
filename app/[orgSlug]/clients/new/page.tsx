import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { createCustomerFormAction } from "@/app/actions/customers";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/clients/customer-form";

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/clients`);

  return (
    <div className="space-y-6">
      <PageHeader title="New client" description="Add a customer to your books." />
      <CustomerForm
        orgSlug={orgSlug}
        showOpeningBalance
        action={createCustomerFormAction.bind(null, orgSlug)}
        submitLabel="Create client"
      />
    </div>
  );
}
