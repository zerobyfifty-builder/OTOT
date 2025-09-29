import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Share2, Download, Facebook, Twitter, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const pledgePoints = [
  "Respect nature by following marked paths and protecting natural surroundings",
  "Leave no waste behind by disposing of trash properly and keeping natural areas clean", 
  "Support reforestation to fight climate change through tree planting",
  "Reduce my carbon footprint by choosing eco-friendly travel options",
  "Respect wildlife by observing animals without disturbing their habitats",
  "Respect local cultures by honoring traditions and supporting communities",
  "Use resources wisely by conserving water and minimizing waste",
  "Camp responsibly in designated areas with eco-friendly practices",
  "Learn and share about Kenya's conservation efforts",
  "Care for our global environment through responsible tourism"
];

export const PledgeCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { user } = useAuth();

  const nextSlide = () => {
    if (currentSlide < pledgePoints.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const takePledge = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          pledge_status: true, 
          pledge_date: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Congratulations! You\'ve taken the Responsible Traveler Pledge!');
      // Navigate to tree planting page
      window.location.href = '/carbon-calculator';
    } catch (error) {
      console.error('Error taking pledge:', error);
      toast.error('Failed to complete pledge');
    }
  };

  const shareOnSocial = (platform: string) => {
    const text = "I've taken the Responsible Traveler Pledge and committed to sustainable tourism practices! 🌱";
    const url = window.location.origin;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };

    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
  };

  if (isCompleted) {
    return (
      <Card className="bg-gradient-primary text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-4">🌿 Ready to Make a Difference?</CardTitle>
          <p className="text-lg opacity-90">
            You've committed to responsible travel. Now offset your carbon footprint by planting trees!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={takePledge}
            size="lg" 
            className="w-full bg-white text-accent hover:bg-secondary"
          >
            I want to plant a tree and offset my emissions
          </Button>
          
          <div className="flex justify-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareOnSocial('facebook')}
              className="text-white hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareOnSocial('twitter')}
              className="text-white hover:bg-white/20"
            >
              <Twitter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shareOnSocial('linkedin')}
              className="text-white hover:bg-white/20"
            >
              <Linkedin className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Responsible Traveler Pledge</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={prevSlide}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1}/{pledgePoints.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / pledgePoints.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="py-8">
        <div className="text-center space-y-6">
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-lg leading-relaxed min-h-[3rem]">
            {pledgePoints[currentSlide]}
          </p>
          
          <Button onClick={nextSlide} className="mt-6">
            {currentSlide === pledgePoints.length - 1 ? 'Complete Pledge' : 'Ready to Act'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};