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
  onClick
}) => {
  const content = (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        
        <div className="text-center py-4">
          <p className="text-4xl font-bold">
            <span className="text-foreground">{metric}</span>
            {' '}
            <span className="text-muted-foreground text-2xl">{unit}</span>
          </p>
        </div>
        
        <Button 
          variant={buttonVariant}
          className="w-full"
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
