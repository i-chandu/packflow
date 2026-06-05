import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  basePath,
  page,
  totalPages,
  searchParams,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  function hrefFor(p: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)}>Previous</Link>
          ) : (
            <span>Previous</span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          asChild={page < totalPages}
        >
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </Button>
      </div>
    </div>
  );
}
