import { Calculator, BarChart3, Home, Plane, TreePine } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

const NAV = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Trips", url: "/my-trips", icon: Plane },
  { title: "My Trees", url: "/my-trees", icon: TreePine },
  { title: "My Impact", url: "/my-impact", icon: BarChart3 },
  { title: "Carbon Calculator", url: "/carbon-calculator", icon: Calculator },
];

export function TouristLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell items={NAV} brand="Traveler" tone="tourist">
      {children}
    </AppShell>
  );
}
