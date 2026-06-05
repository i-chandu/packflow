import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { createProductFormAction } from "@/app/actions/products";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { listSuppliersForSelect } from "@/lib/queries/products";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/products`);

  const suppliers = await listSuppliersForSelect(ctx.organization.id);

  const boundAction = createProductFormAction.bind(null, orgSlug);

  return (
    <div className="space-y-6">
      <PageHeader title="New product" description="Add a box to your catalog." />
      <ProductForm
        orgSlug={orgSlug}
        suppliers={suppliers}
        action={boundAction}
        submitLabel="Create product"
      />
    </div>
  );
}
