import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrgNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        This workspace does not exist or you do not have access.
      </p>
      <Button asChild variant="outline">
        <Link href="/organizations">Your workspaces</Link>
      </Button>
    </div>
  );
}
