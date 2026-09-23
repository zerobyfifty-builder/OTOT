import { Building2, ClipboardList, DollarSign, Home, Trees, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export function MinistryLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const isAdmin = session?.role === "ministry_admin";
  const nav = [
    { title: "Dashboard", url: "/ministry/dashboard", icon: Home },
    { title: "Tree Orders", url: "/ministry/donations", icon: Trees },
    { title: "Planting Requests", url: "/ministry/requests", icon: ClipboardList },
    { title: "Plantation Partners", url: "/ministry/partners", icon: Building2 },
    { title: "Disbursements", url: "/ministry/payouts", icon: DollarSign },
    ...(isAdmin ? [{ title: "Users", url: "/ministry/users", icon: Users }] : []),
  ];
  return (
    <AppShell items={nav} brand="Ministry" tone="ministry">
      {children}
    </AppShell>
  );
}
