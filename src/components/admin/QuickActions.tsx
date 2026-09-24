import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuickAction {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
      {actions.map((action) => (
        <Button
          key={action.title}
          size="lg"
          variant={action.primary ? "default" : "secondary"}
          className={
            action.primary
              ? "h-14 w-14 rounded-full shadow-lg bg-admin-accent hover:bg-admin-accent/90 text-white"
              : "h-14 w-14 rounded-full shadow-lg"
          }
          title={action.title}
          aria-label={action.title}
          onClick={action.onClick}
        >
          <action.icon className={action.primary ? "h-6 w-6" : "h-5 w-5"} />
        </Button>
      ))}
    </div>
  );
}
