import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Truck,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: (orgSlug: string) => string;
  icon: LucideIcon;
  mobilePrimary?: boolean;
};

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: (s) => `/${s}`,
    icon: LayoutDashboard,
    mobilePrimary: true,
  },
  {
    title: "Invoices",
    href: (s) => `/${s}/invoices`,
    icon: FileText,
    mobilePrimary: true,
  },
  {
    title: "Clients",
    href: (s) => `/${s}/clients`,
    icon: Users,
  },
  {
    title: "Products",
    href: (s) => `/${s}/products`,
    icon: Package,
  },
  {
    title: "Payments",
    href: (s) => `/${s}/payments`,
    icon: CreditCard,
    mobilePrimary: true,
  },
  {
    title: "Suppliers",
    href: (s) => `/${s}/suppliers`,
    icon: Truck,
  },
  {
    title: "Analytics",
    href: (s) => `/${s}/analytics`,
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: (s) => `/${s}/settings/org`,
    icon: Settings,
  },
];
