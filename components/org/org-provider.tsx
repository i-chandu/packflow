"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OrganizationContext } from "@/lib/org/types";

const OrgContext = createContext<OrganizationContext | null>(null);

export function OrgProvider({
  value,
  children,
}: {
  value: OrganizationContext;
  children: ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrganizationContext {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
