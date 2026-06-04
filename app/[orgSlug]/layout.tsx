import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrgProvider } from "@/components/org/org-provider";
import { AppShell } from "@/components/layout/app-shell";
import { getOrganizationContext } from "@/lib/org/get-organization-context";
import { isValidOrgSlug } from "@/lib/slug";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  if (!isValidOrgSlug(orgSlug)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/${orgSlug}`);
  }

  const ctx = await getOrganizationContext(orgSlug, session.user.id);
  if (!ctx) {
    notFound();
  }

  return (
    <OrgProvider value={ctx}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
