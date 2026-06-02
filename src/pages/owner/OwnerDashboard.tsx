import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TreePine, TrendingUp, TrendingDown, Leaf, Users, Heart,
  RefreshCw, ArrowUpRight, ArrowDownRight, AlertTriangle,
  AlertCircle, Info, ChevronRight, MapPin, ExternalLink
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  AreaChart, Area, Line, LineChart, PieChart, Pie
} from "recharts";
import { useCountUp } from "@/components/owner/dashboard/useCountUp";
import { ExportButton } from "@/components/owner/dashboard/ExportButton";
import { GlobalDateRangeFilter } from "@/components/owner/dashboard/GlobalDateRangeFilter";
import { useDashboardDateRange, PRESET_LABELS } from "@/components/owner/dashboard/useDashboardDateRange";
import { InstitutionalDashboard } from "@/pages/institutional/InstitutionalDashboard";
import { format, subMonths, differenceInDays, startOfYear, endOfYear, getDaysInYear, isWithinInterval } from "date-fns";

// ─── Color constants ───────────────────────────────────────
const C = {
  green: '#3B6D11', teal: '#1D9E75', amber: '#BA7517', red: '#A32D2D',
  muted: '#6B7280', border: '#E5E7EB', barFill: '#639922',
  greenBg: '#EAF3DE', tealBg: '#E1F5EE', amberBg: '#FAEEDA',
};

// ByeWind-inspired pastel KPI tints (light + dark)
const KPI_TINTS = [
  { bg: 'bg-[#E3E7FB] dark:bg-[#2A2E47]', fg: 'text-[#3B4A8C] dark:text-[#C7CEF5]' }, // lilac
  { bg: 'bg-[#E5F0FF] dark:bg-[#1F2A3D]', fg: 'text-[#1E5BB8] dark:text-[#9EC5FF]' }, // sky
  { bg: 'bg-[#EFE6FF] dark:bg-[#2D2342]', fg: 'text-[#6B3FB8] dark:text-[#D4BFFF]' }, // lavender
  { bg: 'bg-[#D7F0E5] dark:bg-[#1E332A]', fg: 'text-[#1D7A52] dark:text-[#9EE3C0]' }, // mint
];

const STATUS_COLORS: Record<string, string> = {
  waiting_to_be_assigned: '#888780',
  assigned: '#378ADD',
  site_prepared: '#BA7517',
  saplings_ready: '#EF9F27',
  planting_scheduled: '#1D9E75',
  sapling_planted: '#5DCAA5',
  being_mapped: '#7F77DD',
  verified: '#534AB7',
  planted: '#639922',
  dead: '#E24B4A',
};

const STATUS_LABELS: Record<string, string> = {
  waiting_to_be_assigned: 'Waiting to be assigned',
  assigned: 'Assigned',
  site_prepared: 'Site prepared',
  saplings_ready: 'Saplings ready',
  planting_scheduled: 'Planting scheduled',
  sapling_planted: 'Sapling planted',
  being_mapped: 'Location Mapped',
  verified: 'Verified',
  planted: 'Planted',
  dead: 'Dead',
};

const STATUS_ORDER = [
  'waiting_to_be_assigned','assigned','site_prepared','saplings_ready',
  'planting_scheduled','sapling_planted','being_mapped','verified','planted','dead'
];

// ─── Helpers ───────────────────────────────────────────────
function getDateRange(rangeKey: string): Date {
  const now = new Date();
  switch (rangeKey) {
    case '1M': return subMonths(now, 1);
    case '3M': return subMonths(now, 3);
    case '6M': return subMonths(now, 6);
    case '1Y': return subMonths(now, 12);
    default: return subMonths(now, 3);
  }
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

// ─── Animated progress bar ─────────────────────────────────
const AnimBar = ({ pct, color, track }: { pct: number; color: string; track: string }) => {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.min(pct, 100)), 100); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: track }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, background: color }} />
    </div>
  );
};

// ─── ByeWind-style thin breakdown bar (label · bar · count) ──
const ThinBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
  const [w, setW] = useState(0);
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  useEffect(() => { const t = setTimeout(() => setW(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="w-24 truncate text-muted-foreground">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="tabular-nums text-foreground font-medium w-12 text-right">{fmtNum(value)}</span>
    </div>
  );
};

// ─── Donut ring ────────────────────────────────────────────
const DonutRing = ({ pct }: { pct: number }) => {
  const r = 50, circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => { const t = setTimeout(() => setOffset(circ - (circ * Math.min(pct, 100)) / 100), 200); return () => clearTimeout(t); }, [pct, circ]);
  return (
    <svg width={120} height={120} className="mx-auto">
      <circle cx={60} cy={60} r={r} fill="none" stroke={C.greenBg} strokeWidth={10} />
      <circle cx={60} cy={60} r={r} fill="none" stroke={C.green} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 60 60)" className="transition-all duration-[1500ms] ease-in-out" />
      <text x={60} y={56} textAnchor="middle" className="fill-current text-foreground" fontSize={18} fontWeight={500}>
        {pct.toFixed(1)}%
      </text>
      <text x={60} y={72} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>of annual target</text>
    </svg>
  );
};

// ─── Card wrapper (ByeWind soft surface) ───────────────────
const DCard = ({ children, className = '', delay = 0, tint }: { children: React.ReactNode; className?: string; delay?: number; tint?: string }) => (
  <div
    className={`${tint ?? 'bg-card dark:bg-[#1C1F26]'} rounded-2xl border border-border/40 dark:border-white/5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] transition-all duration-300 animate-fade-in ${className}`}
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
  >
    {children}
  </div>
);

// ─── ByeWind-style pastel KPI tile ─────────────────────────
const KpiTile = ({
  label, value, delta, deltaPositive, suffix, tint, delay = 0, decimals = 0,
}: {
  label: string;
  value: number;
  delta?: string;
  deltaPositive?: boolean;
  suffix?: string;
  tint: { bg: string; fg: string };
  delay?: number;
  decimals?: number;
}) => {
  const animated = useCountUp(value, 1200, decimals);
  const display = decimals > 0 ? animated.toFixed(decimals) : fmtNum(Math.round(animated));
  return (
    <div
      className={`${tint.bg} rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,24,40,0.08)] animate-fade-in cursor-default`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <p className={`text-[13px] font-medium ${tint.fg} opacity-80`}>{label}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className={`text-[28px] leading-none font-semibold tabular-nums ${tint.fg}`}>
          {display}
          {suffix && <span className="text-[14px] font-medium opacity-70 ml-1">{suffix}</span>}
        </p>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${tint.fg} opacity-80`}>
            {delta}
            {deltaPositive === true && <ArrowUpRight className="h-3 w-3" />}
            {deltaPositive === false && <ArrowDownRight className="h-3 w-3" />}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Crosshair tooltip for area chart (ByeWind bubble) ─────
const CrosshairTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-foreground text-background px-2.5 py-1.5 text-[11px] font-semibold shadow-lg tabular-nums">
      {fmtNum(payload[0].value)}
      <div className="text-[10px] font-normal opacity-70 mt-0.5">{label}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const OwnerDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { range: globalRange, setPreset, setCustom } = useDashboardDateRange();
  const chartRange = { from: globalRange.from, to: globalRange.to };

  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Refs for export
  const nationalRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const beatRef = useRef<HTMLDivElement>(null);
  const speciesRef = useRef<HTMLDivElement>(null);
  const nurseryRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const contribRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // ─── User profile ─────────────────────────────────────
  const { data: userProfile } = useQuery({
    queryKey: ["ownerProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*, roles!inner(name, display_name), organizations!inner(*, partner_types(name))")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const orgInfo = userProfile?.organizations as any;
  const userName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || user?.user_metadata?.full_name
    : null;

  // Check if institutional
  const ownerType = (() => {
    const roleName = (userProfile?.roles as any)?.name || '';
    if (roleName === 'government_partner') return 'government';
    const category = orgInfo?.category || '';
    if (category === 'government') return 'government';
    const partnerTypeName = orgInfo?.partner_types?.name || '';
    if (partnerTypeName.toLowerCase().includes('government')) return 'government';
    return 'plantation';
  })();

  // ─── Tree status pipeline ─────────────────────────────
  const { data: treePipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ["dashPipeline", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trees")
        .select("planting_status")
        .eq("owner_org_id", orgInfo.id);
      const counts: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        counts[t.planting_status] = (counts[t.planting_status] || 0) + 1;
      });
      return counts;
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Contribution data ────────────────────────────────
  const { data: contributions } = useQuery({
    queryKey: ["dashContributions", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contribution_tracking")
        .select("contribution_id, tourist_name, country, num_trees, amount_paid, created_at, trip_id, status")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Recent transitions (activity feed) ───────────────
  const { data: recentTransitions } = useQuery({
    queryKey: ["dashTransitions", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tree_status_transitions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Assignments for monthly chart & beats/species/nurseries ──
  const { data: assignments } = useQuery({
    queryKey: ["dashAssignments", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tree_planting_assignments")
        .select("*, mdm_location_beats(name, beat_code), nurseries(cbo_name, nursery_type, county), seed_species(category, common_name)")
        .limit(1000);
      return data || [];
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Community impact ─────────────────────────────────
  const { data: communityData } = useQuery({
    queryKey: ["dashCommunity", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_impact")
        .select("*")
        .eq("owner_org_id", orgInfo.id);
      return data || [];
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Nurseries active count ───────────────────────────
  const { data: nurseriesData } = useQuery({
    queryKey: ["dashNurseries", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("nurseries")
        .select("id, cbo_name, is_active, nursery_type, county, capacity")
        .eq("owner_org_id", orgInfo.id);
      return data || [];
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Trees grouped by location (beat performance fallback) ──
  const { data: treesByLocation } = useQuery({
    queryKey: ["dashTreesByLocation", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trees")
        .select("location_name")
        .eq("owner_org_id", orgInfo.id)
        .not("location_name", "is", null);
      const map: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        const k = (t.location_name as string) || 'Unknown';
        map[k] = (map[k] || 0) + 1;
      });
      return map;
    },
    enabled: !!orgInfo?.id,
  });

  // ─── Seed species master (species breakdown fallback) ──
  const { data: seedSpeciesAll } = useQuery({
    queryKey: ["dashSeedSpecies"],
    queryFn: async () => {
      const { data } = await supabase.from("seed_species").select("category");
      return data || [];
    },
  });

  // ═══ Computed values ═══════════════════════════════════
  const planted = treePipeline?.planted || 0;
  const totalTracked = Object.values(treePipeline || {}).reduce((s, v) => s + v, 0);
  const co2Tonnes = planted > 0 ? (planted * 22) / 1000 : 0;
  const uniqueTourists = new Set((contributions || []).filter(c => c.tourist_name).map(c => c.tourist_name)).size;
  const uniqueCountries = new Set((contributions || []).filter(c => c.country).map(c => c.country)).size;
  const communityMembers = (assignments || []).reduce((s, a) => s + (a.community_participants || 0), 0);
  const survivalRate = 0; // No survival tracking data yet

  // Year progress
  const now = new Date();
  const yearStart = startOfYear(now);
  const dayOfYear = differenceInDays(now, yearStart) + 1;
  const daysInYear = 365;
  const yearPct = (dayOfYear / daysInYear) * 100;

  // Annual target
  const annualTarget = 50000;
  const annualPct = annualTarget > 0 ? (planted / annualTarget) * 100 : 0;
  const remaining = Math.max(annualTarget - planted, 0);
  const daysLeft = daysInYear - dayOfYear;
  const treesPerDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0;

  // ─── Filtered KPIs based on global date range ─────────
  const inRange = (iso?: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= globalRange.from && d <= globalRange.to;
  };
  const filteredKpis = useMemo(() => {
    const contribs = (contributions || []).filter(c => inRange(c.created_at as any));
    const assigns = (assignments || []).filter((a: any) => inRange(a.created_at));
    const treesPlantedRange = contribs.reduce((s, c) => s + (c.num_trees || 0), 0);
    const co2Range = (treesPlantedRange * 22) / 1000;
    const touristsRange = new Set(contribs.filter(c => c.tourist_name).map(c => c.tourist_name)).size;
    const communityRange = assigns.reduce((s: number, a: any) => s + (a.community_participants || 0), 0);
    return { treesPlantedRange, co2Range, touristsRange, communityRange };
  }, [contributions, assignments, globalRange]);

  const rangeLabel = `${PRESET_LABELS[globalRange.preset]} · ${format(globalRange.from, 'MMM d')} – ${format(globalRange.to, 'MMM d, yyyy')}`;

  // Weekly stats for trend
  const oneWeekAgo = subMonths(now, 0); // Simplified: we just use total
  
  // Monthly chart data
  const monthlyData = useMemo(() => {
    if (!treePipeline) return [];
    // Use status transitions for monthly breakdown since assignments may not have actual_planting_date
    // Fallback: show pipeline status distribution as monthly placeholder
    const fromDate = chartRange.from || subMonths(new Date(), 3);
    const toDate = chartRange.to || new Date();
    const months: Record<string, number> = {};
    (contributions || []).forEach(c => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      if (d < fromDate || d > toDate) return;
      const key = format(d, 'MMM yyyy');
      months[key] = (months[key] || 0) + c.num_trees;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [contributions, chartRange, treePipeline]);

  const monthlyTarget = Math.round(annualTarget / 12);
  const avgPerMonth = monthlyData.length > 0 ? Math.round(monthlyData.reduce((s, m) => s + m.count, 0) / monthlyData.length) : 0;

  // Species breakdown — prefer assignments; fall back to seed_species master
  const speciesBreakdown = useMemo(() => {
    const cats: Record<string, number> = { Indigenous: 0, Agroforestry: 0, Exotic: 0, 'Fruit trees': 0 };
    const normalize = (raw: string) => {
      const r = (raw || '').toLowerCase();
      if (r.includes('indigenous')) return 'Indigenous';
      if (r.includes('agro')) return 'Agroforestry';
      if (r.includes('fruit')) return 'Fruit trees';
      return 'Exotic';
    };
    (assignments || []).forEach(a => {
      const cat = normalize((a.seed_species as any)?.category || 'Indigenous');
      cats[cat]++;
    });
    let total = Object.values(cats).reduce((s, v) => s + v, 0);
    if (total === 0 && seedSpeciesAll && seedSpeciesAll.length > 0) {
      seedSpeciesAll.forEach((s: any) => {
        const cat = normalize(s.category || 'indigenous');
        cats[cat]++;
      });
      total = Object.values(cats).reduce((s, v) => s + v, 0);
    }
    return Object.entries(cats).map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 }));
  }, [assignments, seedSpeciesAll]);

  // Beat performance — prefer assignments; fall back to trees grouped by location_name
  const beatPerformance = useMemo(() => {
    const beats: Record<string, { name: string; code: string; count: number }> = {};
    (assignments || []).forEach(a => {
      const b = a.mdm_location_beats as any;
      if (!b) return;
      const key = b.name || 'Unknown';
      if (!beats[key]) beats[key] = { name: key, code: b.beat_code || '', count: 0 };
      beats[key].count++;
    });
    let list = Object.values(beats);
    if (list.length === 0 && treesByLocation) {
      list = Object.entries(treesByLocation).map(([name, count]) => ({ name, code: '', count }));
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [assignments, treesByLocation]);

  // Nursery activity — prefer assignments; fall back to nurseries master (capacity)
  const nurseryActivity = useMemo(() => {
    const nurs: Record<string, { name: string; type: string; county: string; count: number }> = {};
    (assignments || []).forEach(a => {
      const n = a.nurseries as any;
      if (!n) return;
      const key = n.cbo_name || 'Unknown';
      if (!nurs[key]) nurs[key] = { name: key, type: n.nursery_type || 'CBO', county: n.county || '', count: 0 };
      nurs[key].count += a.sapling_count_allocated || 0;
    });
    let list = Object.values(nurs);
    if (list.length === 0 && nurseriesData && nurseriesData.length > 0) {
      list = nurseriesData.map((n: any) => ({
        name: n.cbo_name || 'Unknown',
        type: n.nursery_type || 'CBO',
        county: n.county || '',
        count: n.capacity || 0,
      }));
    }
    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [assignments, nurseriesData]);

  // Alerts
  const alerts = useMemo(() => {
    const items: { level: 'red' | 'amber' | 'blue'; title: string; sub: string }[] = [];
    
    // Unassigned > 14 days
    const waitingTrees = (contributions || []).filter(c => {
      const age = differenceInDays(now, new Date(c.created_at));
      return age > 14 && c.status === 'contribution_received';
    });
    if (waitingTrees.length > 0) {
      items.push({ level: 'red', title: `Trees unassigned beyond 14 days (${waitingTrees.length})`, sub: waitingTrees.slice(0, 3).map(c => c.contribution_id).join(', ') });
    }

    // Monthly report due
    const dayInMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (daysInMonth - dayInMonth <= 5) {
      items.push({ level: 'amber', title: 'Monthly KFS report due', sub: `Due ${format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'MMM d, yyyy')}` });
    }

    // Quarterly survey
    const qMonths = [0, 3, 6, 9];
    if (qMonths.includes(now.getMonth())) {
      items.push({ level: 'amber', title: 'Quarterly survival survey due', sub: 'Recommended for all active beats' });
    }

    // Certificates pending
    const certPending = (contributions || []).filter(c => c.status === 'planted' || c.num_trees > 0).length;
    if (certPending > 0) {
      items.push({ level: 'blue', title: 'Certificates ready to issue', sub: `${certPending} tourist certificates pending` });
    }

    return items;
  }, [contributions]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setLastUpdated(new Date());
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Auto-refresh every 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Count-up values
  const plantedUp = useCountUp(planted);
  const co2Up = useCountUp(co2Tonnes, 1200, 1);
  const touristUp = useCountUp(uniqueTourists);
  const communityUp = useCountUp(communityMembers);

  // ─── Institutional redirect ───────────────────────────
  if (ownerType === 'government' && userProfile) {
    return <InstitutionalDashboard />;
  }

  const isLoading = pipelineLoading;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 md:p-8 space-y-5">

        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 animate-fade-in">
          <div>
            <p className="text-[12px] text-muted-foreground/80 tracking-wide">Dashboards / Default</p>
            <h1 className="text-[26px] font-semibold text-foreground mt-0.5">
              Welcome, {orgInfo?.name || 'Owner Dashboard'}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5">
              {userName && <>Logged in as {userName} · </>}
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              MFC-ICLIP Restoration Programme · One Tourist One Tree Initiative
            </p>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>Last updated: {format(lastUpdated, 'MMM d, HH:mm')}</span>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─── Global date range filter bar ────────────── */}
        <div className="flex items-center justify-between gap-3 animate-fade-in" style={{ animationDelay: '40ms', animationFillMode: 'backwards' }}>
          <div className="text-[12px] text-muted-foreground">
            Showing dashboard metrics for <span className="font-medium text-foreground">{PRESET_LABELS[globalRange.preset]}</span>
          </div>
          <GlobalDateRangeFilter range={globalRange} onPreset={setPreset} onCustom={setCustom} />
        </div>

        {/* ─── Consolidated National Mission Hero ───────── */}
        <DCard delay={80}>
          <div ref={nationalRef} className="p-5 sm:p-6">
            <div className="flex items-start justify-between mb-5 gap-2">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-1.5">
                  Kenya 15 billion trees — OTOT contribution
                  <ExportButton cardRef={nationalRef} filename="National-Contribution" iconOnly />
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Tracking MFC-ICLIP impact toward Kenya's national reforestation mission by 2032
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: filtered KPIs + 15B progress bars */}
              <div className="lg:col-span-2 space-y-5">
                {isLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile label="Trees Planted" value={filteredKpis.treesPlantedRange} tint={KPI_TINTS[0]} delay={0} />
                    <KpiTile label="CO₂ Offset" value={filteredKpis.co2Range} suffix="t" decimals={1} delta="ICAO" tint={KPI_TINTS[1]} delay={80} />
                    <KpiTile label="Tourist Contributors" value={filteredKpis.touristsRange} tint={KPI_TINTS[2]} delay={160} />
                    <KpiTile label="Community Members" value={filteredKpis.communityRange} tint={KPI_TINTS[3]} delay={240} />
                  </div>
                )}

                <div className="space-y-3.5 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">Year progress</span>
                      <span className="font-medium text-foreground tabular-nums">{dayOfYear} of {daysInYear} days</span>
                    </div>
                    <AnimBar pct={yearPct} color={C.muted} track={C.greenBg} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-muted-foreground">OTOT contribution to national 15B target</span>
                      <span className="font-medium text-foreground tabular-nums">{fmtNum(planted)} of 15,000,000,000</span>
                    </div>
                    <AnimBar pct={(planted / 15000000000) * 100} color={C.green} track={C.greenBg} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-muted-foreground">Year 1 annual target (50,000 trees)</span>
                      <span className="font-medium text-foreground tabular-nums">{fmtNum(planted)} of 50,000 · {annualPct.toFixed(1)}%</span>
                    </div>
                    <AnimBar pct={annualPct} color={C.teal} track={C.tealBg} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-muted-foreground">MFC-ICLIP zone — 317,000 ha restoration</span>
                      <span className="font-medium text-foreground tabular-nums">{fmtNum(planted)} trees planted</span>
                    </div>
                    <AnimBar pct={planted > 0 ? Math.min((planted / 500000) * 100, 100) : 0} color={C.amber} track={C.amberBg} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'SDG 13 — Climate action', bg: '#EAF3DE', color: '#3B6D11' },
                    { label: 'SDG 15 — Life on land', bg: '#E1F5EE', color: '#1D9E75' },
                    { label: 'Baku Declaration 2024', bg: '#E8F4FD', color: '#2D7AB3' },
                    { label: '15B Trees initiative', bg: '#FAEEDA', color: '#BA7517' },
                    { label: 'Glasgow Tourism Declaration', bg: '#F3F4F6', color: '#6B7280' },
                  ].map((b) => (
                    <span key={b.label} className="px-2.5 py-1 text-[11px] font-medium rounded-full" style={{ background: b.bg, color: b.color }}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Year 1 donut + compact stats */}
              <div ref={missionRef} className="lg:border-l lg:border-border/40 lg:pl-6 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-medium text-foreground">Year 1 target</h3>
                  <ExportButton cardRef={missionRef} filename="Year1-Target" iconOnly />
                </div>
                <DonutRing pct={annualPct} />
                <div className="w-full mt-4 space-y-1.5 text-[12px]">
                  {[
                    ['Planted', fmtNum(planted)],
                    ['Target', fmtNum(annualTarget)],
                    ['Remaining', fmtNum(remaining)],
                    ['Days left in year', String(daysLeft)],
                    ['Trees needed/day', fmtNum(treesPerDay)],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between py-1 border-b border-border/40 last:border-b-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-medium tabular-nums ${
                        label === 'Trees needed/day'
                          ? treesPerDay > 300 ? 'text-[#A32D2D]' : treesPerDay > 150 ? 'text-[#BA7517]' : 'text-[#3B6D11]'
                          : 'text-foreground'
                      }`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DCard>


        {/* ─── Section 3: ByeWind chart + side breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly planting — smooth area chart */}
          <DCard className="lg:col-span-2" delay={200}>
            <div ref={chartRef} className="p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-center gap-5">
                  <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                    Trees Planted
                    <ExportButton cardRef={chartRef} filename="Monthly-Planting" iconOnly />
                  </h2>
                  <div className="hidden sm:flex items-center gap-4 text-[12px] text-muted-foreground">
                    <span className="text-foreground/70">Planted</span>
                    <span>Target</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[11px] pl-3 border-l border-border/60">
                    <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-foreground" />This period</span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />Target</span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
              </div>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="plantArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v >= 1000 ? `${v/1000}K` : String(v)} axisLine={false} tickLine={false} />
                    <Tooltip content={<CrosshairTooltip />} cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '0' }} />
                    <ReferenceLine y={monthlyTarget} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={C.green}
                      strokeWidth={2}
                      fill="url(#plantArea)"
                      dot={{ r: 0 }}
                      activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2, fill: C.green }}
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-[12px] text-muted-foreground">No planting data in this range</div>
              )}
              <div className="flex items-center gap-3 mt-3 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">Planting season: Active</span>
                <span className="text-muted-foreground">Avg/month: <span className="text-foreground font-medium tabular-nums">{fmtNum(avgPerMonth)}</span></span>
              </div>
            </div>
          </DCard>

          {/* Pipeline — thin-bar status breakdown (ByeWind "Traffic by Website" style) */}
          <DCard delay={300}>
            <div ref={pipelineRef} className="p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                  Trees by Status
                  <ExportButton cardRef={pipelineRef} filename="Status-Pipeline" iconOnly />
                </h2>
              </div>
              <div className="space-y-3.5">
                {STATUS_ORDER.map(status => {
                  const count = treePipeline?.[status] || 0;
                  if (count === 0 && status === 'dead') return null;
                  return (
                    <ThinBar
                      key={status}
                      label={STATUS_LABELS[status]}
                      value={count}
                      max={totalTracked || 1}
                      color={STATUS_COLORS[status]}
                    />
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 text-[12px] text-muted-foreground">
                Total trees tracked: <span className="font-semibold text-foreground tabular-nums">{fmtNum(totalTracked)}</span>
              </div>
            </div>
          </DCard>
        </div>

        {/* ─── Section 3b: Beat performance (full width band) ─ */}
        <DCard delay={400}>
          <div ref={beatRef} className="p-5">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                  Forest beat performance
                  <ExportButton cardRef={beatRef} filename="Beat-Performance" iconOnly />
                </h2>
                <p className="text-[12px] text-muted-foreground">Top beats by trees planted</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
            </div>
            {beatPerformance.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {beatPerformance.map((beat) => {
                  const maxCount = beatPerformance[0]?.count || 1;
                  return (
                    <div key={beat.name}>
                      <div className="flex items-center justify-between text-[12px]">
                        <div>
                          <span className="font-medium text-foreground">{beat.name}</span>
                          <span className="text-[11px] text-muted-foreground ml-1">· {beat.code}</span>
                        </div>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtNum(beat.count)}</span>
                      </div>
                      <AnimBar pct={(beat.count / maxCount) * 100} color={C.green} track={C.greenBg} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-foreground">No beat data yet</div>
            )}
            <div className="mt-3 pt-3 border-t border-border/40">
              <a href="/owner/forest-locations" className="text-[12px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
                View all beats <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </DCard>


        {/* ─── Section 4: Insight Row ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Species breakdown */}
          <DCard delay={300}>
            <div ref={speciesRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Species Planted
                    <ExportButton cardRef={speciesRef} filename="Species-Breakdown" iconOnly />
                  </h2>
                  
                </div>
                <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
              </div>
              {speciesBreakdown.some(s => s.count > 0) ? (
                <div className="space-y-3">
                  {speciesBreakdown.map(sp => {
                    const colors: Record<string, string> = { Indigenous: C.green, Agroforestry: C.teal, Exotic: C.amber, 'Fruit trees': '#D4537E' };
                    return (
                      <div key={sp.name}>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-foreground">{sp.name}</span>
                          <span className="font-semibold text-[#3B6D11]">{fmtNum(sp.count)}</span>
                        </div>
                        <AnimBar pct={sp.pct} color={colors[sp.name] || C.green} track="#F3F4F6" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-[12px] text-[#6B7280]">No species data yet</div>
              )}
            </div>
          </DCard>

          {/* Nursery & CBO */}
          <DCard delay={400}>
            <div ref={nurseryRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Nursery/CBO seedlings supply
                    <ExportButton cardRef={nurseryRef} filename="Nursery-Supply" iconOnly />
                  </h2>
                  
                </div>
                <span className="text-[11px] text-muted-foreground">{rangeLabel}</span>
              </div>
              {nurseryActivity.length > 0 ? (
                <div className="space-y-3">
                  {nurseryActivity.map(n => (
                    <div key={n.name} className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{n.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                            background: n.type === 'CBO' ? C.greenBg : n.type === 'Government' ? '#E8F4FD' : '#F3F4F6',
                            color: n.type === 'CBO' ? C.green : n.type === 'Government' ? '#2D7AB3' : C.muted,
                          }}>{n.type}</span>
                          <span className="text-[11px] text-[#6B7280]">{n.county}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[#EAF3DE] text-[#3B6D11]">
                        {fmtNum(n.count)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-[12px] text-[#6B7280]">No nursery data yet</div>
              )}
              <hr className="my-3 border-[#E5E7EB] dark:border-gray-700" />
              <div className="flex gap-4 text-[11px] text-[#6B7280] dark:text-gray-400">
                <span>Active nurseries: <strong className="text-foreground">{nurseriesData?.filter(n => n.is_active).length || 0}</strong></span>
                <span>Total allocated: <strong className="text-foreground">{fmtNum(nurseryActivity.reduce((s, n) => s + n.count, 0))}</strong></span>
              </div>
            </div>
          </DCard>

          {/* Alerts */}
          <DCard delay={500}>
            <div ref={alertRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Alerts & actions needed
                    <ExportButton cardRef={alertRef} filename="Alerts" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Items requiring your attention</p>
                </div>
                {alerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#A32D2D] animate-pulse">
                    {alerts.length}
                  </span>
                )}
              </div>
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert, i) => {
                    const iconColors = { red: { bg: '#FEE2E2', color: '#A32D2D' }, amber: { bg: '#FAEEDA', color: '#BA7517' }, blue: { bg: '#E8F4FD', color: '#2D7AB3' } };
                    const { bg, color } = iconColors[alert.level];
                    const Icon = alert.level === 'red' ? AlertCircle : alert.level === 'amber' ? AlertTriangle : Info;
                    return (
                      <div key={i} className="flex items-start gap-2.5 group">
                        <div className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: bg }}>
                          <Icon className="h-3 w-3" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-foreground">{alert.title}</p>
                          <p className="text-[11px] text-[#6B7280] dark:text-gray-400 truncate">{alert.sub}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[120px] text-center">
                  <div className="w-10 h-10 rounded-full bg-[#EAF3DE] flex items-center justify-center mb-2">
                    <TreePine className="h-5 w-5 text-[#3B6D11]" />
                  </div>
                  <p className="text-[12px] text-[#3B6D11] font-medium">All clear — no actions pending.</p>
                </div>
              )}
            </div>
          </DCard>
        </div>

        {/* ─── Section 5: Activity Row ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard className="lg:col-span-2" delay={400}>
            <div ref={activityRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Recent planting activity
                    <ExportButton
                      filename="Planting-Activity"
                      iconOnly
                      csvData={() => {
                        const header = 'Contribution ID,From Status,To Status,Date\n';
                        const rows = (recentTransitions || []).map(t => `${t.contribution_id},${t.from_status},${t.to_status},${t.created_at}`).join('\n');
                        return header + rows;
                      }}
                    />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Latest field operations logged</p>
                </div>
              </div>
              {recentTransitions && recentTransitions.length > 0 ? (
                <div className="space-y-0">
                  {recentTransitions.map((t: any) => {
                    const td = t.transition_data || {};
                    return (
                      <div key={t.id} className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-md hover:bg-[#F8FAF8] dark:hover:bg-gray-800 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-[13px] text-foreground">
                            Tree moved to <strong>{STATUS_LABELS[t.to_status] || t.to_status}</strong>
                            {td.planter_name && <> by {td.planter_name}</>}
                            <span className="text-[#6B7280]"> · {t.contribution_id}</span>
                          </p>
                          <p className="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">
                            {format(new Date(t.created_at), 'MMM d, yyyy · HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-[12px] text-[#6B7280]">No activity recorded yet</div>
              )}
            </div>
          </DCard>

          <DCard delay={500}>
            <div ref={contribRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Recent tourist contributions
                    <ExportButton
                      filename="Contributions"
                      iconOnly
                      csvData={() => {
                        const header = 'Contribution ID,Tourist,Trees,Amount,Date\n';
                        const rows = (contributions || []).slice(0, 6).map(c => `${c.contribution_id},${c.tourist_name || ''},${c.num_trees},${c.amount_paid},${c.created_at}`).join('\n');
                        return header + rows;
                      }}
                    />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Latest donor allocations</p>
                </div>
              </div>
              {contributions && contributions.length > 0 ? (
                <>
                  <div className="space-y-2.5">
                    {contributions.slice(0, 5).map(c => (
                      <div key={c.contribution_id} className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{c.contribution_id}</p>
                          <p className="text-[11px] text-[#6B7280] dark:text-gray-400">
                            Tourist · {format(new Date(c.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className="font-semibold text-[13px] text-[#3B6D11]">{c.num_trees} trees</span>
                      </div>
                    ))}
                  </div>
                  <hr className="my-3 border-[#E5E7EB] dark:border-gray-700" />
                  <div className="space-y-1 text-[11px] text-[#6B7280] dark:text-gray-400">
                    <p>Average trees per contributor: <strong className="text-foreground">
                      {contributions.length > 0 ? Math.round(contributions.reduce((s, c) => s + c.num_trees, 0) / contributions.length) : 0}
                    </strong></p>
                    <p>Total funds received: <strong className="text-foreground">
                      ${fmtNum(contributions.reduce((s, c) => s + Number(c.amount_paid), 0))}
                    </strong></p>
                  </div>
                </>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-[12px] text-[#6B7280]">No contributions yet</div>
              )}
            </div>
          </DCard>
        </div>

        {/* ─── Section 6: Programme Footer ─────────────── */}
        <DCard delay={500}>
          <div ref={footerRef} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                Programme context — MFC-ICLIP Restoration Programme
                <ExportButton cardRef={footerRef} filename="Programme-Context" iconOnly />
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Target Area', value: '317,000 ha' },
                { label: 'Community Farmers', value: '100,000+' },
                { label: 'MoU Duration', value: '5 years (2025–2030)' },
                { label: 'SDG Alignment', value: 'SDG 13, 15' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg bg-[#F8FAF8] dark:bg-gray-800">
                  <p className="text-[11px] text-[#6B7280] dark:text-gray-400">{s.label}</p>
                  <p className="text-[16px] font-semibold text-foreground mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-[#6B7280] dark:text-gray-400 leading-relaxed">
              The Mau Forest Complex Integrated Conservation and Livelihood Improvement Programme (MFC-ICLIP) is a flagship nature-based solution launched in October 2025, integrating environmental restoration with inclusive economic empowerment across Kenya's largest water tower. Funded through OTOT tourist contributions managed by the Kenya Tourism Board.
            </p>
            <p className="text-[11px] text-[#6B7280] dark:text-gray-400 mt-3 text-right">
              Data contributes to Kenya's National Forestry Inventory · KFS reporting · 15B Trees Secretariat
            </p>
          </div>
        </DCard>

      </div>
    </div>
  );
};
