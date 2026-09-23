import { Building2, CreditCard, Home, Leaf, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

const NAV = [
  { title: "Overview", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Partners", url: "/admin/vendors", icon: Building2 },
  { title: "Tree Types", url: "/admin/tree-types", icon: Leaf },
  { title: "Financial Transactions", url: "/admin/finance", icon: CreditCard },
  { title: "Configuration", url: "/admin/config", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={NAV} brand="Super admin" tone="admin">
      {children}
    </AppShell>
  );
}
