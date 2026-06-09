import { ReactNode } from "react";
import { GlassBackdrop } from "./GlassBackdrop";

/**
 * Tourist portal theme wrapper.
 * Applies the scoped liquid-glass theme tokens and mounts the cinematic backdrop.
 * Wrap tourist routes only — other portals are unaffected.
 */
export const TouristShell = ({ children }: { children: ReactNode }) => {
  return (
    <div data-theme="tourist-glass" className="relative min-h-screen">
      <GlassBackdrop />
      {children}
    </div>
  );
};
