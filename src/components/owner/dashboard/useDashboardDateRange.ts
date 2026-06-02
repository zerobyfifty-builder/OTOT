import { useCallback, useEffect, useState } from 'react';
import { startOfYear, startOfQuarter, startOfDay, subDays } from 'date-fns';

export type DashboardPreset =
  | 'today'
  | '7d'
  | '30d'
  | '90d'
  | 'quarter'
  | 'ytd'
  | 'all'
  | 'custom';

export interface DashboardRange {
  from: Date;
  to: Date;
  preset: DashboardPreset;
}

const STORAGE_KEY = 'owner-dashboard-range';

export function rangeFromPreset(preset: DashboardPreset, custom?: { from: Date; to: Date }): DashboardRange {
  const now = new Date();
  const to = now;
  switch (preset) {
    case 'today':   return { from: startOfDay(now), to, preset };
    case '7d':      return { from: subDays(now, 7), to, preset };
    case '30d':     return { from: subDays(now, 30), to, preset };
    case '90d':     return { from: subDays(now, 90), to, preset };
    case 'quarter': return { from: startOfQuarter(now), to, preset };
    case 'ytd':     return { from: startOfYear(now), to, preset };
    case 'all':     return { from: new Date(2000, 0, 1), to, preset };
    case 'custom':
      return { from: custom?.from ?? subDays(now, 30), to: custom?.to ?? now, preset };
  }
}

export const PRESET_LABELS: Record<DashboardPreset, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  quarter: 'This quarter',
  ytd: 'Year to date',
  all: 'All time',
  custom: 'Custom range',
};

function load(): DashboardRange {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return rangeFromPreset('30d');
    const parsed = JSON.parse(raw);
    if (parsed.preset === 'custom' && parsed.from && parsed.to) {
      return rangeFromPreset('custom', { from: new Date(parsed.from), to: new Date(parsed.to) });
    }
    return rangeFromPreset(parsed.preset || '30d');
  } catch {
    return rangeFromPreset('30d');
  }
}

export function useDashboardDateRange() {
  const [range, setRangeState] = useState<DashboardRange>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preset: range.preset,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      }));
    } catch { /* ignore */ }
  }, [range]);

  const setPreset = useCallback((preset: DashboardPreset) => {
    setRangeState(rangeFromPreset(preset));
  }, []);

  const setCustom = useCallback((from: Date, to: Date) => {
    setRangeState(rangeFromPreset('custom', { from, to }));
  }, []);

  return { range, setPreset, setCustom };
}
