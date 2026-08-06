/**
 * Host-based portal separation.
 *
 * One build, one Supabase project, one `users` table — but three public
 * hostnames, each exposing only its own slice of the router:
 *
 *   www.onetouristonetree.com     → tourist portal (+ super-admin God Mode)
 *   office.onetouristonetree.com  → ministry portal (institutional partners)
 *   partner.onetouristonetree.com → vendor portal (owners, lodges, agents)
 *
 * Nothing here touches the database. A session that belongs to another portal
 * is simply not usable on this host (see `components/auth/PortalGate.tsx`).
 */

export type PortalId = 'tourist' | 'ministry' | 'vendor';

/** Roles as returned by the `get_user_role` RPC (null/'user' → 'tourist'). */
export type AppRole =
  | 'tourist'
  | 'super_admin'
  | 'government_partner'
  | 'business_partner'
  | 'owner'
  | 'travel_agent';

export interface PortalConfig {
  id: PortalId;
  /** Human-readable name, used in login copy. */
  name: string;
  /** Roles allowed to hold a session on this host. */
  allowedRoles: AppRole[];
  /** Google OAuth is tourist-only — the other portals are invite-only. */
  allowsGoogleAuth: boolean;
  /** Self-service signup is tourist-only; other users are created by an admin. */
  allowsSignup: boolean;
  /** Where an unauthenticated visitor lands on this host. */
  entryPath: string;
}

export const PORTALS: Record<PortalId, PortalConfig> = {
  tourist: {
    id: 'tourist',
    name: 'One Tourist One Tree',
    allowedRoles: ['tourist', 'super_admin'],
    allowsGoogleAuth: true,
    allowsSignup: true,
    entryPath: '/',
  },
  ministry: {
    id: 'ministry',
    name: 'Ministry Portal',
    allowedRoles: ['government_partner'],
    allowsGoogleAuth: false,
    allowsSignup: false,
    entryPath: '/auth/login',
  },
  vendor: {
    id: 'vendor',
    name: 'Partner Portal',
    allowedRoles: ['owner', 'business_partner', 'travel_agent'],
    allowsGoogleAuth: false,
    allowsSignup: false,
    entryPath: '/auth/login',
  },
};

/**
 * Which portal owns which route prefixes. A path listed here is reachable only
 * on its own host; paths that appear nowhere (404s, `/auth/*`) are shared.
 */
const PORTAL_PATHS: Record<PortalId, string[]> = {
  tourist: [
    '/',
    '/home',
    '/dashboard',
    '/profile',
    '/my-trips',
    '/my-trees',
    '/my-impact',
    '/impact',
    '/carbon-calculator',
    '/tree-purchase',
    '/certificates',
    '/verify',
    '/pledge',
    '/pledgea',
    '/pledgeb',
    '/pledgec',
    '/co2calculator',
    '/admin',
    '/auth/signup',
  ],
  ministry: ['/institutional'],
  vendor: ['/owner', '/lodge', '/agent'],
};

const OVERRIDE_STORAGE_KEY = 'otot.portal-override';

const isPortalId = (value: unknown): value is PortalId =>
  value === 'tourist' || value === 'ministry' || value === 'vendor';

/** Local dev only: `?portal=ministry` sticks for the rest of the tab session. */
const readLocalOverride = (hostname: string): PortalId | null => {
  const isLocal =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  if (!isLocal || typeof window === 'undefined') return null;

  try {
    const requested = new URLSearchParams(window.location.search).get('portal');
    if (isPortalId(requested)) {
      window.sessionStorage.setItem(OVERRIDE_STORAGE_KEY, requested);
      return requested;
    }
    const stored = window.sessionStorage.getItem(OVERRIDE_STORAGE_KEY);
    return isPortalId(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const detectPortal = (
  hostname: string = typeof window === 'undefined' ? '' : window.location.hostname,
): PortalId => {
  // Explicit build-time override (used by preview/staging builds).
  const forced = import.meta.env.VITE_FORCE_PORTAL as string | undefined;
  if (isPortalId(forced)) return forced;

  const host = hostname.toLowerCase();
  const localOverride = readLocalOverride(host);
  if (localOverride) return localOverride;

  const subdomain = host.split('.')[0];
  if (subdomain === 'office') return 'ministry';
  if (subdomain === 'partner') return 'vendor';

  // www, the apex domain, the Railway default domain and localhost all serve
  // the tourist app.
  return 'tourist';
};

export const CURRENT_PORTAL: PortalId = detectPortal();
export const currentPortal: PortalConfig = PORTALS[CURRENT_PORTAL];

const matchesPrefix = (pathname: string, prefix: string) =>
  prefix === '/'
    ? pathname === '/'
    : pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The portal that owns `pathname`, or null when the path is shared/unknown. */
export const resolvePortalForPath = (pathname: string): PortalId | null => {
  let owner: PortalId | null = null;
  let bestLength = 0;

  (Object.keys(PORTAL_PATHS) as PortalId[]).forEach((portalId) => {
    PORTAL_PATHS[portalId].forEach((prefix) => {
      if (matchesPrefix(pathname, prefix) && prefix.length >= bestLength) {
        owner = portalId;
        bestLength = prefix.length;
      }
    });
  });

  return owner;
};

/** `get_user_role` returns null for plain end-users; normalise that to 'tourist'. */
export const normalizeRole = (rawRole: unknown): AppRole => {
  if (typeof rawRole !== 'string' || rawRole === 'user') return 'tourist';
  const known: AppRole[] = [
    'tourist',
    'super_admin',
    'government_partner',
    'business_partner',
    'owner',
    'travel_agent',
  ];
  return known.includes(rawRole as AppRole) ? (rawRole as AppRole) : 'tourist';
};

export const isRoleAllowedOnPortal = (role: AppRole, portalId: PortalId = CURRENT_PORTAL) =>
  PORTALS[portalId].allowedRoles.includes(role);

/** Landing page for a role once it is signed in on its own portal. */
export const portalHomePath = (role: AppRole, portalId: PortalId = CURRENT_PORTAL): string => {
  if (!isRoleAllowedOnPortal(role, portalId)) return PORTALS[portalId].entryPath;

  switch (role) {
    case 'super_admin':
      return '/admin';
    case 'government_partner':
      return '/institutional/dashboard';
    case 'business_partner':
      return '/lodge/dashboard';
    case 'owner':
      return '/owner/dashboard';
    case 'travel_agent':
      return '/agent/dashboard';
    default:
      return '/dashboard';
  }
};
