import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  metric: string;
  unit: string;
  buttonText: string;
  buttonVariant?: 'default' | 'outline';
  href?: string;
  onClick?: () => void;
  colorVariant?: 'green' | 'lavender' | 'beige';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  metric,
  unit,
  buttonText,
  buttonVariant = 'default',
  href,
  onClick,
  colorVariant = 'green'
}) => {
  const bgColorClass = {
    green: 'bg-card-light-green',
    lavender: 'bg-card-light-lavender',
    beige: 'bg-card-light-beige'
  }[colorVariant];

  const content = (
    <Card className={`h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${bgColorClass} border-none`}>
      <CardContent className="p-8 space-y-6 flex flex-col h-full">
        {/* Icon and text header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        
        {/* Metric display - centered and prominent */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-center">
            <span className="text-6xl font-bold text-foreground tracking-tight">
              {metric}
            </span>
            {' '}
            <span className="text-3xl font-medium text-muted-foreground">
              {unit}
            </span>
          </div>
        </div>
        
        {/* Button */}
        <Button 
          variant={buttonVariant}
          className="w-full h-12 text-base font-medium"
          onClick={onClick}
          asChild={!!href}
        >
          {href ? <Link to={href}>{buttonText}</Link> : <span>{buttonText}</span>}
        </Button>
      </CardContent>
    </Card>
  );

  return content;
};
