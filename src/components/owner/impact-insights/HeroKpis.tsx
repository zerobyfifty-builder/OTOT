import { Card } from "@/components/ui/card";
import { TreePine, Cloud, Users, Leaf } from "lucide-react";
import { useCountUp } from "@/components/owner/dashboard/useCountUp";

interface Props {
  treesPlanted: number;
  co2Kg: number;
  livesTouched: number;
  biodiversity: number;
}

const Tile = ({
  icon: Icon,
  label,
  value,
  suffix,
  tint,
}: {
  icon: typeof TreePine;
  label: string;
  value: number;
  suffix?: string;
  tint: string;
}) => {
  const animated = useCountUp(value, 1200, suffix === "" ? 1 : 0);
  return (
    <Card className="p-5 bg-card border shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {animated.toLocaleString()}
            {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};

export const HeroKpis = ({ treesPlanted, co2Kg, livesTouched, biodiversity }: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile
        icon={TreePine}
        label="Trees Planted"
        value={treesPlanted}
        tint="bg-emerald-50 text-emerald-700"
      />
      <Tile
        icon={Cloud}
        label="CO₂ Offset"
        value={Math.round(co2Kg)}
        suffix="kg"
        tint="bg-sky-50 text-sky-700"
      />
      <Tile
        icon={Users}
        label="Lives Touched"
        value={livesTouched}
        tint="bg-amber-50 text-amber-700"
      />
      <Tile
        icon={Leaf}
        label="Biodiversity Index"
        value={biodiversity}
        suffix=""
        tint="bg-lime-50 text-lime-700"
      />
    </div>
  );
};
