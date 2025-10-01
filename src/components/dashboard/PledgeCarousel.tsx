import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { generatePledgeCertificate, downloadCertificate } from '@/utils/certificateGenerator';
import { SocialShare } from '@/components/certificates/SocialShare';
import pledgeNature from '@/assets/pledge-nature.jpg';
import pledgeCommunity from '@/assets/pledge-community.jpg';
import pledgeWater from '@/assets/pledge-water.jpg';
import treeGreen from '@/assets/tree-green.png';

interface PledgePoint {
  text: string;
  image: string;
}

const pledgePoints: PledgePoint[] = [
  {
    text: "Respect nature by following marked paths and protecting natural surroundings",
    image: pledgeNature,
  },
  {
    text: "Leave no waste behind by disposing of trash properly and keeping natural areas clean",
    image: pledgeNature,
  },
  {
    text: "Support reforestation to fight climate change through tree planting",
    image: pledgeNature,
  },
  {
    text: "Reduce my carbon footprint by choosing eco-friendly travel options",
    image: pledgeNature,
  },
  {
    text: "Respect wildlife by observing animals without disturbing their habitats",
    image: pledgeNature,
  },
  {
    text: "Respect local cultures by honoring traditions and supporting communities",
    image: pledgeCommunity,
  },
  {
    text: "Use resources wisely by conserving water and minimizing waste",
    image: pledgeWater,
  },
  {
    text: "Camp responsibly in designated areas with eco-friendly practices",
    image: pledgeNature,
  },
  {
    text: "Learn and share about Kenya's conservation efforts",
    image: pledgeCommunity,
  },
  {
    text: "Care for our global environment through responsible tourism",
    image: pledgeNature,
  },
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
      <Card className="h-full">
        <CardContent className="p-8 flex flex-col h-full">
          <h2 className="text-xl font-bold mb-6 text-foreground">
            Ready to Make a Difference?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 flex-1">
            {/* Left section - Certificate */}
            <div className="flex flex-col justify-between space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Share Pledge Certificate
              </h3>
              
              <div className="flex-1 flex items-center justify-center">
                <div className="bg-primary/10 rounded-lg p-6 flex items-center justify-center aspect-[3/4] w-full max-w-[200px]">
                  <div className="text-center space-y-2">
                    <div className="text-4xl">📜</div>
                    <p className="text-xs text-muted-foreground">Certificate Preview</p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={takePledge}
                variant="outline"
                className="w-fit border-primary text-foreground hover:bg-primary hover:text-black"
              >
                <Download className="h-4 w-4 mr-2" />
                Download & Share
              </Button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-border self-stretch mx-auto" />

            {/* Right section - Plant a Tree */}
            <div className="flex flex-col justify-between space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Take Climate Action
              </h3>
              
              <div className="flex-1 flex items-center justify-center">
                <img 
                  src={treeGreen} 
                  alt="Tree icon" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <Button 
                onClick={() => window.location.href = '/carbon-calculator'}
                variant="outline"
                className="w-fit border-primary text-foreground hover:bg-primary hover:text-black"
              >
                Plant a Tree
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPledge = pledgePoints[currentSlide];

  return (
    <Card className="relative overflow-hidden h-full">
      <CardContent className="p-0 h-full">
        <div className="grid md:grid-cols-2 h-full">
          {/* Left side - Text content */}
          <div className="p-8 flex flex-col justify-between bg-background/85 backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Responsible Traveler Pledge</h3>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[40px] text-center">
                    {currentSlide + 1}/{pledgePoints.length}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={nextSlide}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="w-16 bg-secondary rounded-full h-1 mb-8">
                <div 
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentSlide + 1) / pledgePoints.length) * 100}%` }}
                />
              </div>

              <p className="text-lg leading-relaxed mb-8">
                {currentPledge.text}
              </p>
            </div>
            
            <Button onClick={nextSlide} className="w-fit">
              {currentSlide === pledgePoints.length - 1 ? 'Complete Pledge' : 'Ready to Act'}
            </Button>
          </div>

          {/* Right side - Image */}
          <div className="relative h-64 md:h-full">
            <img 
              src={currentPledge.image} 
              alt="Pledge illustration"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};