import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface ClimateActionCardProps {
  image: string;
  title: string;
  description: string;
  onClick?: () => void;
}

export function ClimateActionCard({ image, title, description, onClick }: ClimateActionCardProps) {
  return (
    <Card
      className="glass-card group cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden border-none"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative h-48 overflow-hidden">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
          <div className="flex items-start justify-between gap-4">
            <p className="text-muted-foreground flex-1">{description}</p>
            <ArrowRight className="h-5 w-5 text-foreground flex-shrink-0 mt-1 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
