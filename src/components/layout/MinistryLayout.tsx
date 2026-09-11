import { Building2, ClipboardList, Home, Landmark, Trees, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function MinistryLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const isAdmin = session?.role === "ministry_admin";
  const nav = [
    { title: "Dashboard", url: "/ministry/dashboard", icon: Home },
    { title: "Donations", url: "/ministry/donations", icon: Trees },
    { title: "Requests", url: "/ministry/requests", icon: ClipboardList },
    { title: "Partners", url: "/ministry/partners", icon: Building2 },
    { title: "Payouts", url: "/ministry/payouts", icon: Landmark },
    ...(isAdmin ? [{ title: "Users", url: "/ministry/users", icon: Users }] : []),
  ];
  return (
    <AppShell items={nav} brand="Ministry" mainClassName="bg-background">
      {children}
    </AppShell>
  );
}
