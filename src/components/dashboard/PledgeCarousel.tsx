import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { generatePledgeCertificate, downloadCertificate } from '@/utils/certificateGenerator';
import { SocialShare } from '@/components/certificates/SocialShare';

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
      // Update pledge status
      const { error } = await supabase
        .from('users')
        .update({ 
          pledge_status: true, 
          pledge_date: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Fetch user details for certificate
      const { data: userData } = await supabase
        .from('users')
        .select('email, otot_id')
        .eq('user_id', user.id)
        .single();

      // Generate and download certificate
      const certificateBlob = await generatePledgeCertificate({
        userName: userData?.email || 'Responsible Traveler',
        userId: user.id,
        ototId: userData?.otot_id,
      });

      downloadCertificate(certificateBlob, 'responsible-traveler-pledge-certificate.pdf');

      toast.success('Congratulations! Certificate downloaded successfully!');
      
      // Navigate to tree planting page after a short delay
      setTimeout(() => {
        window.location.href = '/carbon-calculator';
      }, 2000);
    } catch (error) {
      console.error('Error taking pledge:', error);
      toast.error('Failed to complete pledge');
    }
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
            <Download className="h-4 w-4 mr-2" />
            Download Certificate & Plant Trees
          </Button>
          
          <SocialShare type="pledge" />
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