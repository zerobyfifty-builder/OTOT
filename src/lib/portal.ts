import type { AppRole } from "@/types/otot";

export type PortalId = "tourist" | "ministry" | "vendor";

export interface PortalConfig {
  id: PortalId;
  name: string;
  allowedRoles: AppRole[];
  allowsSignup: boolean;
  entryPath: string;
}

export const PORTALS: Record<PortalId, PortalConfig> = {
  tourist: {
    id: "tourist",
    name: "One Tourist One Tree",
    allowedRoles: ["tourist", "super_admin"],
    allowsSignup: true,
    entryPath: "/",
  },
  ministry: {
    id: "ministry",
    name: "Ministry Portal",
    allowedRoles: ["ministry_admin", "ministry_user"],
    allowsSignup: false,
    entryPath: "/auth/login",
  },
  vendor: {
    id: "vendor",
    name: "Plantation Partner Portal",
    allowedRoles: ["partner_admin", "partner_agent"],
    allowsSignup: false,
    entryPath: "/auth/login",
  },
};

const OVERRIDE_STORAGE_KEY = "otot.portal-override";

const isPortalId = (value: unknown): value is PortalId =>
  value === "tourist" || value === "ministry" || value === "vendor";

export const detectPortal = (
  hostname: string = typeof window === "undefined" ? "" : window.location.hostname,
): PortalId => {
  const forced = import.meta.env.VITE_FORCE_PORTAL as string | undefined;
  if (isPortalId(forced)) return forced;

  const host = hostname.toLowerCase();
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";

  if (isLocal && typeof window !== "undefined") {
    try {
      const requested = new URLSearchParams(window.location.search).get("portal");
      if (isPortalId(requested)) {
        window.sessionStorage.setItem(OVERRIDE_STORAGE_KEY, requested);
        return requested;
      }
      const stored = window.sessionStorage.getItem(OVERRIDE_STORAGE_KEY);
      if (isPortalId(stored)) return stored;
    } catch {
      /* ignore */
    }
  }

  const subdomain = host.split(".")[0];
  if (subdomain === "office") return "ministry";
  if (subdomain === "partner") return "vendor";
  return "tourist";
};

export const portalHomePath = (role: AppRole): string => {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "ministry_admin":
    case "ministry_user":
      return "/ministry/dashboard";
    case "partner_admin":
      return "/partner/dashboard";
    case "partner_agent":
      return "/partner/assignments";
    default:
      return "/dashboard";
  }
};

export const roleLabel = (role: AppRole): string => {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "ministry_admin":
      return "Ministry Admin";
    case "ministry_user":
      return "Ministry User";
    case "partner_admin":
      return "Partner Admin";
    case "partner_agent":
      return "Partner Agent";
    default:
      return "Tourist";
  }
};
