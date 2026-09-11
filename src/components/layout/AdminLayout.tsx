import { Building2, CreditCard, Home, Leaf, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

const NAV = [
  { title: "Overview", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Vendors", url: "/admin/vendors", icon: Building2 },
  { title: "Tree types", url: "/admin/tree-types", icon: Leaf },
  { title: "Finance", url: "/admin/finance", icon: CreditCard },
  { title: "Config", url: "/admin/config", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={NAV} brand="Super admin" mainClassName="bg-admin-cream">
      {children}
    </AppShell>
  );
}
