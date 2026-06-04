"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useOrg } from "@/components/org/org-provider";

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { organization } = useOrg();
  const orgSlug = organization.slug;

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link href={`/${orgSlug}`} className="font-semibold tracking-tight">
          {APP_NAME}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {mainNavItems.map((item) => {
          const href = item.href(orgSlug);
          const active =
            href === `/${orgSlug}`
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <p className="truncate font-medium text-zinc-700 dark:text-zinc-300">
          {organization.name}
        </p>
        <p className="truncate">/{organization.slug}</p>
      </div>
    </aside>
  );
}
