import { ClipboardList, Home, Landmark, ListChecks, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function PartnerLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const isAdmin = session?.role === "partner_admin";
  const nav = isAdmin
    ? [
        { title: "Dashboard", url: "/partner/dashboard", icon: Home },
        { title: "Requests", url: "/partner/requests", icon: ClipboardList },
        { title: "Team", url: "/partner/team", icon: Users },
        { title: "Payouts", url: "/partner/payouts", icon: Landmark },
      ]
    : [{ title: "My assignments", url: "/partner/assignments", icon: ListChecks }];

  return (
    <AppShell items={nav} brand="Plantation partner" mainClassName="bg-background">
      {children}
    </AppShell>
  );
}
