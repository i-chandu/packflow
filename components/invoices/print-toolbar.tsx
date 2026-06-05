"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 print:hidden dark:border-zinc-800 dark:bg-zinc-950">
      <Button variant="outline" size="sm" asChild>
        <Link href={backHref}>Back</Link>
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        Print / Save PDF
      </Button>
    </div>
  );
}
