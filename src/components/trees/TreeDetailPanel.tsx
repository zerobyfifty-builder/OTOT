import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Cloud, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import yourTreeImage from '@/assets/your-tree-demo.png';
import treeCarerImage from '@/assets/tree-carer-demo.png';
import ototTreeIcon from '@/assets/otot-tree-icon-new.png';

type Tree = Database["public"]["Tables"]["trees"]["Row"];

interface TreeDetailPanelProps {
  tree: Tree;
  onClose: () => void;
}

export const TreeDetailPanel: React.FC<TreeDetailPanelProps> = ({ tree, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % 2);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + 2) % 2);

  const treeImage = yourTreeImage;

  const { data: carer } = useQuery({
    queryKey: ['tree-carer', tree.id],
    queryFn: async () => {
      const { data: transitions } = await supabase
        .from('tree_status_transitions')
        .select('to_status, transition_data, created_at')
        .eq('tree_id', tree.id)
        .in('to_status', ['assigned', 'sapling_planted'])
        .order('created_at', { ascending: false });

      if (!transitions || transitions.length === 0) return null;

      let planterId: string | null = null;
      for (const t of transitions) {
        const td = (t.transition_data as Record<string, any>) || {};
        planterId = td.planted_by || td.assigned_to || td.original_assigned_planter_id || null;
        if (planterId) break;
      }
      if (!planterId) return null;

      const { data: planter } = await supabase
        .from('tree_carers')
        .select('id, name, photo_url, age, number_of_kids, county, conservancy, experience_years, gender')
        .eq('id', planterId)
        .maybeSingle();

      return planter;
    },
    enabled: !!tree.id,
  });

  const carerPhoto = carer?.photo_url || treeCarerImage;
  const carerName = carer?.name || 'Tree Carer';
  const carerDescription = carer
    ? `${carer.age ? `A ${carer.age}-year-old ` : 'A '}tree planter${
        carer.number_of_kids ? ` and ${carer.gender === 'Male' ? 'father' : 'mother'} of ${carer.number_of_kids}` : ''
      }${
        carer.conservancy || carer.county
          ? ` from ${carer.conservancy || carer.county}`
          : ''
      }.${
        carer.experience_years
          ? ` They have been planting trees for over ${carer.experience_years} year${carer.experience_years === 1 ? '' : 's'} to protect the local ecosystem, earning a living for their family while helping make the world a better place.`
          : ' They are helping restore the local ecosystem and make the world a better place.'
      }`
    : 'Planter details will be available once a planter has been assigned to your tree.';

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pr-12 border-b bg-background shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img src={ototTreeIcon} alt="OTOT" className="h-8 w-8 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">Planted by:</span>
            <a
              href="https://mfc-iclip.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline truncate"
            >
              MFC-ICLIP
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* Carousel */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div
            className="flex transition-transform duration-300 ease-in-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Slide 1: Tree Details */}
            <div className="min-w-full h-full overflow-y-auto px-5 pt-3 pb-16">
              <h3 className="text-lg font-bold text-center mb-2">Your tree</h3>

              <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden shadow-lg">
                <img src={treeImage} alt="Tree" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-primary/90 text-white px-2 py-1 rounded text-xs font-semibold">
                  YOUR TREE
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Tree number:</p>
                    <p className="text-base font-bold truncate">{tree.otot_id}</p>
                  </div>
                  <Button size="sm" className="h-8 px-3 bg-[#8BC34A] hover:bg-[#7CB342] text-white text-xs shrink-0">
                    Track
                  </Button>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Location:
                  </p>
                  <p className="text-sm">Mau Forest Complex (Nakuru)</p>
                </div>

                {tree.latitude && tree.longitude && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <Cloud className="h-3.5 w-3.5" />
                      Weather:
                    </p>
                    <p className="text-sm">23.5°C</p>
                  </div>
                )}
              </div>
            </div>

            {/* Slide 2: Grower Information */}
            <div className="min-w-full h-full overflow-y-auto px-5 pt-3 pb-16">
              <h3 className="text-lg font-bold text-center mb-2">Your tree carer</h3>

              <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={carerPhoto}
                  alt={carerName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = treeCarerImage; }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold">{carerName}</p>
                  <Button size="sm" className="h-8 px-3 bg-[#8BC34A] hover:bg-[#7CB342] text-white text-xs shrink-0">
                    Track
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {carerDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Slider arrows */}
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg p-0 z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg p-0 z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {[0, 1].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === index ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
