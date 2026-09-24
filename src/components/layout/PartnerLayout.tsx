import { DollarSign, FileText, Home, ListChecks, Trees, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function PartnerLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const isAdmin = session?.role === "partner_admin";
  const nav = isAdmin
    ? [
        { title: "Dashboard", url: "/partner/dashboard", icon: Home },
        { title: "Tree Orders", url: "/partner/requests", icon: Trees },
        { title: "Team Assignments", url: "/partner/assignments", icon: ListChecks },
        { title: "Team", url: "/partner/team", icon: Users },
        { title: "Climate Funding", url: "/partner/payouts", icon: DollarSign },
      ]
    : [{ title: "My Tickets", url: "/partner/assignments", icon: FileText }];

  return (
    <AppShell items={nav} brand="Plantation partner" tone="partner">
      {children}
    </AppShell>
  );
}
