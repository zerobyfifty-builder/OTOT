import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface EducationalCardProps {
  icon: LucideIcon;
  title: string;
  className?: string;
}

export const EducationalCard: React.FC<EducationalCardProps> = ({
  icon: Icon,
  title,
  className
}) => {
  return (
    <Card className={`text-center hover:shadow-lg transition-shadow cursor-pointer ${className}`}>
      <CardHeader>
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
    </Card>
  );
};