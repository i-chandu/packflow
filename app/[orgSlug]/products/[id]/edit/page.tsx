import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { updateProductFormAction } from "@/app/actions/products";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { getProductById, listSuppliersForSelect } from "@/lib/queries/products";
import { canWriteOperations } from "@/lib/org/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) notFound();
  if (!canWriteOperations(ctx.membership.role)) redirect(`/${orgSlug}/products/${id}`);

  const [product, suppliers] = await Promise.all([
    getProductById(ctx.organization.id, id),
    listSuppliersForSelect(ctx.organization.id),
  ]);
  if (!product) notFound();

  const boundAction = updateProductFormAction.bind(null, orgSlug, id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit product" description={product.name} />
      <ProductForm
        orgSlug={orgSlug}
        suppliers={suppliers}
        product={product}
        action={boundAction}
        submitLabel="Save changes"
      />
    </div>
  );
}
