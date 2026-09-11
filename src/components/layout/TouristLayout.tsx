import { Calculator, Home, HeartHandshake, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

const NAV = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Calculate", url: "/carbon-calculator", icon: Calculator },
  { title: "Donate", url: "/donate", icon: HeartHandshake },
  { title: "Profile", url: "/profile", icon: User },
];

export function TouristLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={NAV} brand="Traveler" mainClassName="bg-secondary/40">
      {children}
    </AppShell>
  );
}
