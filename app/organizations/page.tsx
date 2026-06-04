import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUserOrganizations } from "@/lib/org/get-organization-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export default async function OrganizationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organizations = await listUserOrganizations(session.user.id);

  if (organizations.length === 1) {
    redirect(`/${organizations[0].slug}`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">{APP_NAME}</h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Choose a workspace to continue.
      </p>
      <div className="space-y-3">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{org.name}</CardTitle>
              <CardDescription>/{org.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={`/${org.slug}`}>Open workspace</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {organizations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              You are not a member of any organization yet.
            </p>
            <Button asChild>
              <Link href="/signup">Create a workspace</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
