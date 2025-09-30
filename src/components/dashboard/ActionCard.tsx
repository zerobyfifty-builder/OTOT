import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant?: 'default' | 'outline' | 'secondary';
  href?: string;
  onClick?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  icon: Icon,
  title,
  description,
  buttonText,
  buttonVariant = 'default',
  href,
  onClick
}) => {
  const CardComponent = (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 h-full">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/90 transition-colors">
          <Icon className="h-8 w-8 text-black" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          variant={buttonVariant}
          className="w-full"
          onClick={onClick}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {CardComponent}
      </Link>
    );
  }

  return CardComponent;
};