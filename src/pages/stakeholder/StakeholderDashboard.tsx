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
  ResponsiveContainer, ReferenceLine, Cell 
} from "recharts";
import { useCountUp } from "@/components/stakeholder/dashboard/useCountUp";
import { ExportButton } from "@/components/stakeholder/dashboard/ExportButton";
import { ChartDateRangePicker } from "@/components/institutional/ChartDateRangePicker";
import { InstitutionalDashboard } from "@/pages/institutional/InstitutionalDashboard";
import { format, subMonths, differenceInDays, startOfYear, endOfYear, getDaysInYear, isWithinInterval } from "date-fns";

// ─── Color constants ───────────────────────────────────────
const C = {
  green: '#3B6D11', teal: '#1D9E75', amber: '#BA7517', red: '#A32D2D',
  muted: '#6B7280', border: '#E5E7EB', barFill: '#639922',
  greenBg: '#EAF3DE', tealBg: '#E1F5EE', amberBg: '#FAEEDA',
};

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
  being_mapped: 'Being mapped',
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
    <div className="h-2 w-full rounded-full" style={{ background: track }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, background: color }} />
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
      <text x={60} y={72} textAnchor="middle" fill={C.muted} fontSize={10}>of annual target</text>
    </svg>
  );
};

// ─── Card wrapper ──────────────────────────────────────────
const DCard = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <div
    className={`bg-card dark:bg-gray-900 border border-[#E5E7EB] dark:border-gray-700 rounded-xl hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const StakeholderDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  type DR = { from: Date | undefined; to: Date | undefined };
  const defaultRange = (): DR => ({ from: subMonths(new Date(), 3), to: new Date() });
  const [chartRange, setChartRange] = useState<DR>(defaultRange());
  const [speciesRange, setSpeciesRange] = useState<DR>(defaultRange());
  const [beatRange, setBeatRange] = useState<DR>(defaultRange());
  const [nurseryRange, setNurseryRange] = useState<DR>(defaultRange());
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
    queryKey: ["stakeholderProfile", user?.id],
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
  const stakeholderType = (() => {
    const roleName = (userProfile?.roles as any)?.name || '';
    if (roleName === 'institutional_partner') return 'institutional';
    const category = orgInfo?.category || '';
    if (category === 'institutional') return 'institutional';
    const partnerTypeName = orgInfo?.partner_types?.name || '';
    if (partnerTypeName.toLowerCase().includes('institutional')) return 'institutional';
    return 'plantation';
  })();

  // ─── Tree status pipeline ─────────────────────────────
  const { data: treePipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ["dashPipeline", orgInfo?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trees")
        .select("planting_status")
        .eq("stakeholder_org_id", orgInfo.id);
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
        .limit(8);
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
        .eq("stakeholder_org_id", orgInfo.id);
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
        .select("id, cbo_name, is_active, nursery_type, county")
        .eq("stakeholder_org_id", orgInfo.id);
      return data || [];
    },
    enabled: !!orgInfo?.id,
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

  // Species breakdown
  const speciesBreakdown = useMemo(() => {
    const cats: Record<string, number> = { Indigenous: 0, Agroforestry: 0, Exotic: 0, 'Fruit trees': 0 };
    (assignments || []).forEach(a => {
      const cat = (a.seed_species as any)?.category || 'Indigenous';
      if (cats[cat] !== undefined) cats[cat]++;
      else cats['Indigenous']++;
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats).map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 }));
  }, [assignments]);

  // Beat performance
  const beatPerformance = useMemo(() => {
    const beats: Record<string, { name: string; code: string; count: number }> = {};
    (assignments || []).forEach(a => {
      const b = a.mdm_location_beats as any;
      if (!b) return;
      const key = b.name || 'Unknown';
      if (!beats[key]) beats[key] = { name: key, code: b.beat_code || '', count: 0 };
      beats[key].count++;
    });
    return Object.values(beats).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [assignments]);

  // Nursery activity
  const nurseryActivity = useMemo(() => {
    const nurs: Record<string, { name: string; type: string; county: string; count: number }> = {};
    (assignments || []).forEach(a => {
      const n = a.nurseries as any;
      if (!n) return;
      const key = n.cbo_name || 'Unknown';
      if (!nurs[key]) nurs[key] = { name: key, type: n.nursery_type || 'CBO', county: n.county || '', count: 0 };
      nurs[key].count += a.sapling_count_allocated || 0;
    });
    return Object.values(nurs).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [assignments]);

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
  if (stakeholderType === 'institutional' && userProfile) {
    return <InstitutionalDashboard />;
  }

  const isLoading = pipelineLoading;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: '#F8FAF8' }}>
      <div className="p-4 sm:p-6 md:p-8 space-y-5 dark:bg-gray-950">

        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-[24px] font-medium text-foreground">
              Welcome, {orgInfo?.name || 'Stakeholder Dashboard'}
            </h1>
            <p className="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
              {userName && <>Logged in as {userName} · </>}
              <span className="inline-block w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse" />
              MFC-ICLIP Restoration Programme · One Tourist One Tree Initiative
            </p>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-[#6B7280] dark:text-gray-400">
            <span>Last updated: {format(lastUpdated, 'MMM d, HH:mm')}</span>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Year progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#6B7280] dark:text-gray-400">
            <span>Year progress</span>
            <span>{dayOfYear} of {daysInYear} days</span>
          </div>
          <AnimBar pct={yearPct} color={C.green} track={C.greenBg} />
        </div>

        {/* ─── Section 1: KPI Cards ────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <DCard>
                <div className="p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: C.greenBg }}>
                    <TreePine className="h-4 w-4" style={{ color: C.green }} />
                  </div>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Total trees planted</p>
                  <p className="text-[22px] font-semibold text-foreground">{fmtNum(plantedUp)}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-gray-400">Confirmed planted status</p>
                </div>
              </DCard>

              <DCard>
                <div className="p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: C.tealBg }}>
                    <TrendingUp className="h-4 w-4" style={{ color: C.teal }} />
                  </div>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Survival rate</p>
                  {survivalRate > 0 ? (
                    <p className={`text-[22px] font-semibold ${survivalRate >= 80 ? 'text-[#3B6D11]' : survivalRate >= 60 ? 'text-[#BA7517]' : 'text-[#A32D2D]'}`}>
                      {survivalRate.toFixed(1)}%
                    </p>
                  ) : (
                    <p className="text-[22px] font-semibold text-[#6B7280]">—</p>
                  )}
                  <p className="text-[11px] text-[#6B7280] dark:text-gray-400">{survivalRate > 0 ? 'Target: 80–90%' : 'No data yet'}</p>
                </div>
              </DCard>

              <DCard>
                <div className="p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: '#E8F4FD' }}>
                    <Leaf className="h-4 w-4" style={{ color: '#2D7AB3' }} />
                  </div>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">CO₂ offset (tonnes)</p>
                  <p className="text-[22px] font-semibold text-foreground">{co2Up > 0 ? co2Up.toFixed(1) : '—'}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-gray-400">{co2Tonnes > 0 ? '22 kg/tree/year · ICAO' : 'No data yet'}</p>
                </div>
              </DCard>

              <DCard>
                <div className="p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: C.amberBg }}>
                    <Users className="h-4 w-4" style={{ color: C.amber }} />
                  </div>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Tourist contributors</p>
                  <p className="text-[22px] font-semibold text-foreground">{fmtNum(touristUp)}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-gray-400">From {uniqueCountries || '—'} countries</p>
                </div>
              </DCard>

              <DCard>
                <div className="p-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: '#F3E8FF' }}>
                    <Heart className="h-4 w-4" style={{ color: '#7C3AED' }} />
                  </div>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Community members</p>
                  <p className="text-[22px] font-semibold text-foreground">{communityMembers > 0 ? fmtNum(communityUp) : '—'}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-gray-400">{communityMembers > 0 ? 'Employed in planting ops' : 'No data yet'}</p>
                </div>
              </DCard>
            </>
          )}
        </div>

        {/* ─── Section 2: National Mission + Ring ────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DCard className="lg:col-span-2" delay={100}>
            <div ref={nationalRef} className="p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Kenya 15 billion trees — OTOT contribution
                    <ExportButton cardRef={nationalRef} filename="National-Contribution" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400 mt-0.5">Tracking MFC-ICLIP impact toward Kenya's national reforestation mission</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-[#6B7280] dark:text-gray-400">OTOT contribution to national 15B target</span>
                    <span className="font-medium text-foreground">{fmtNum(planted)} of 15,000,000,000</span>
                  </div>
                  <AnimBar pct={(planted / 15000000000) * 100} color={C.green} track={C.greenBg} />
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-[#6B7280] dark:text-gray-400">Year 1 annual target (50,000 trees)</span>
                    <span className="font-medium text-foreground">{fmtNum(planted)} of 50,000 · {annualPct.toFixed(1)}%</span>
                  </div>
                  <AnimBar pct={annualPct} color={C.teal} track={C.tealBg} />
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-[#6B7280] dark:text-gray-400">MFC-ICLIP zone — 317,000 ha restoration</span>
                    <span className="font-medium text-foreground">{fmtNum(planted)} trees planted</span>
                  </div>
                  <AnimBar pct={planted > 0 ? Math.min((planted / 500000) * 100, 100) : 0} color={C.amber} track={C.amberBg} />
                </div>
              </div>

              <hr className="my-4 border-[#E5E7EB] dark:border-gray-700" />
              <div className="flex flex-wrap gap-2">
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
          </DCard>

          <DCard delay={200}>
            <div ref={missionRef} className="p-5 flex flex-col items-center">
              <div className="w-full flex items-start justify-between mb-4">
                <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                  Year 1 target
                  <ExportButton cardRef={missionRef} filename="Year1-Target" iconOnly />
                </h2>
              </div>
              <DonutRing pct={annualPct} />
              <div className="w-full mt-4 space-y-1.5 text-[12px]">
                {[
                  ['Planted', fmtNum(planted)],
                  ['Target', fmtNum(annualTarget)],
                  ['Remaining', fmtNum(remaining)],
                  ['Days left in year', String(daysLeft)],
                  ['Trees needed/day', fmtNum(treesPerDay)],
                ].map(([label, val], i) => (
                  <div key={label} className="flex justify-between py-1 border-b border-[#E5E7EB] dark:border-gray-700 last:border-b-0">
                    <span className="text-[#6B7280] dark:text-gray-400">{label}</span>
                    <span className={`font-medium ${
                      label === 'Trees needed/day'
                        ? treesPerDay > 300 ? 'text-[#A32D2D]' : treesPerDay > 150 ? 'text-[#BA7517]' : 'text-[#3B6D11]'
                        : 'text-foreground'
                    }`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </DCard>
        </div>

        {/* ─── Section 3: Operational Row ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly planting */}
          <DCard delay={200}>
            <div ref={chartRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Monthly planting progress
                    <ExportButton cardRef={chartRef} filename="Monthly-Planting" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Trees planted per month</p>
                </div>
                <ChartDateRangePicker dateRange={chartRange} onDateRangeChange={setChartRange} />
              </div>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => fmtNum(v)} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [fmtNum(v) + ' trees', 'Count']}
                    />
                    <ReferenceLine y={monthlyTarget} stroke={C.amber} strokeDasharray="5 5" label={{ value: 'Monthly target', fill: C.amber, fontSize: 10 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1000}>
                      {monthlyData.map((entry, i) => (
                        <Cell key={i} fill={entry.count >= monthlyTarget ? C.teal : C.barFill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-[12px] text-[#6B7280]">No planting data in this range</div>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#1D9E75] font-medium">Planting season: Active</span>
                <span className="text-[#6B7280] dark:text-gray-400">Avg/month: {fmtNum(avgPerMonth)}</span>
              </div>
            </div>
          </DCard>

          {/* Pipeline */}
          <DCard delay={300}>
            <div ref={pipelineRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Planting status pipeline
                    <ExportButton cardRef={pipelineRef} filename="Status-Pipeline" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">All tree orders by lifecycle stage</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {STATUS_ORDER.map(status => {
                  const count = treePipeline?.[status] || 0;
                  if (count === 0 && status === 'dead') return null;
                  const pct = totalTracked > 0 ? (count / totalTracked) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                          <span className="text-foreground">{STATUS_LABELS[status]}</span>
                        </div>
                        <span className="font-semibold text-foreground">{fmtNum(count)}</span>
                      </div>
                      <AnimBar pct={pct} color={STATUS_COLORS[status]} track="#F3F4F6" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-gray-700 text-[12px] text-[#6B7280] dark:text-gray-400">
                Total trees tracked: <span className="font-semibold text-foreground">{fmtNum(totalTracked)}</span>
              </div>
            </div>
          </DCard>

          {/* Beat performance */}
          <DCard delay={400}>
            <div ref={beatRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Forest beat performance
                    <ExportButton cardRef={beatRef} filename="Beat-Performance" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Top beats by trees planted</p>
                </div>
                <ChartDateRangePicker dateRange={beatRange} onDateRangeChange={setBeatRange} />
              </div>
              {beatPerformance.length > 0 ? (
                <div className="space-y-3">
                  {beatPerformance.map((beat, i) => {
                    const maxCount = beatPerformance[0]?.count || 1;
                    return (
                      <div key={beat.name}>
                        <div className="flex items-center justify-between text-[12px]">
                          <div>
                            <span className="font-medium text-foreground">{beat.name}</span>
                            <span className="text-[11px] text-[#6B7280] dark:text-gray-400 ml-1">· {beat.code}</span>
                          </div>
                          <span className="font-semibold text-[#3B6D11]">{fmtNum(beat.count)}</span>
                        </div>
                        <AnimBar pct={(beat.count / maxCount) * 100} color={C.green} track={C.greenBg} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-[12px] text-[#6B7280]">No beat data yet</div>
              )}
              <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-gray-700">
                <a href="/stakeholder/forest-locations" className="text-[12px] text-[#1D9E75] hover:underline flex items-center gap-1">
                  View all beats <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </DCard>
        </div>

        {/* ─── Section 4: Insight Row ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Species breakdown */}
          <DCard delay={300}>
            <div ref={speciesRef} className="p-5">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                    Species breakdown
                    <ExportButton cardRef={speciesRef} filename="Species-Breakdown" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Confirmed planted by category</p>
                </div>
                <ChartDateRangePicker dateRange={speciesRange} onDateRangeChange={setSpeciesRange} />
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
                    Nursery & CBO supply
                    <ExportButton cardRef={nurseryRef} filename="Nursery-Supply" iconOnly />
                  </h2>
                  <p className="text-[12px] text-[#6B7280] dark:text-gray-400">Seedlings supplied this quarter</p>
                </div>
                <ChartDateRangePicker dateRange={nurseryRange} onDateRangeChange={setNurseryRange} />
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
                    {contributions.slice(0, 6).map(c => (
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
              <h2 className="text-[14px] font-medium text-foreground">Programme context — MFC-ICLIP Restoration Programme</h2>
              <ExportButton cardRef={footerRef} filename="Programme-Context" />
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
