import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateCustomerFormAction } from "@/app/actions/customers";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getCustomerById } from "@/lib/queries/customers";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/clients/customer-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/clients/${id}`);

  const customer = await getCustomerById(ctx.organization.id, id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit client" description={customer.name} />
      <CustomerForm
        orgSlug={orgSlug}
        customer={customer}
        action={updateCustomerFormAction.bind(null, orgSlug, id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
