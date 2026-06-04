"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Menu, Plus, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useOrg } from "@/components/org/org-provider";
import { canWriteOperations } from "@/lib/org/permissions";
import { mainNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { data: session } = useSession();
  const { organization, membership } = useOrg();
  const pathname = usePathname();
  const orgSlug = organization.slug;
  const canWrite = canWriteOperations(membership.role);

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    session?.user?.email?.slice(0, 2).toUpperCase() ||
    "PF";

  const mobileNav = mainNavItems.filter((i) => i.mobilePrimary);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <AppSidebar className="w-full border-0" />
        </SheetContent>
      </Sheet>

      <div className="hidden flex-1 lg:block">
        <p className="text-sm font-medium">{organization.name}</p>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
        {canWrite && (
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={`/${orgSlug}/invoices/new`}>
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${orgSlug}/notifications`}>
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name ?? "Account"}</p>
                <p className="text-xs text-zinc-500">{session?.user?.email}</p>
                <p className="text-xs capitalize text-zinc-500">{membership.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/organizations">
                <User className="mr-2 h-4 w-4" />
                Switch organization
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${orgSlug}/settings/org`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        {mobileNav.map((item) => {
          const href = item.href(orgSlug);
          const active =
            href === `/${orgSlug}`
              ? pathname === href
              : pathname.startsWith(href);

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium",
                active ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
        {canWrite && (
          <Link
            href={`/${orgSlug}/invoices/new`}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-zinc-900 dark:text-zinc-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
              <Plus className="h-4 w-4" />
            </span>
            New
          </Link>
        )}
      </nav>
    </header>
  );
}
