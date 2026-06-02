import { useMemo, useState } from "react";

export interface SpeciesSlice {
  name: string;
  count: number;
  pct: number;
  color: string;
}

interface Props {
  data: SpeciesSlice[];
  size?: number;
  thickness?: number;
}

// Build an SVG arc path for a donut slice
function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
  const toXY = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const [x1, y1] = toXY(rOuter, startAngle);
  const [x2, y2] = toXY(rOuter, endAngle);
  const [x3, y3] = toXY(rInner, endAngle);
  const [x4, y4] = toXY(rInner, startAngle);
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

export function SpeciesDonut({ data, size = 180, thickness = 28 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = rOuter - thickness;
  const total = data.reduce((s, d) => s + d.count, 0);

  const slices = useMemo(() => {
    if (total === 0) return [];
    const gap = 0.04; // radians
    let cursor = -Math.PI / 2;
    return data
      .filter(d => d.count > 0)
      .map((d, i) => {
        const portion = (d.count / total) * (Math.PI * 2);
        const start = cursor + gap / 2;
        const end = cursor + portion - gap / 2;
        cursor += portion;
        return { ...d, start, end, i };
      });
  }, [data, total]);

  const active = hover !== null ? slices[hover] : null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {slices.map((s, i) => {
          const isActive = hover === i;
          const isDimmed = hover !== null && !isActive;
          const path = arcPath(
            cx,
            cy,
            isActive ? rOuter + 4 : rOuter,
            rInner,
            s.start,
            s.end
          );
          return (
            <path
              key={s.name}
              d={path}
              fill={s.color}
              opacity={isDimmed ? 0.35 : 1}
              style={{
                transition: "opacity 200ms ease, d 200ms ease",
                cursor: "pointer",
                filter: isActive ? "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" : "none",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {active && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ animation: "fadeIn 150ms ease" }}
        >
          <div className="bg-foreground text-background text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
            {active.pct.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}
