import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Cloud, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Fetch assigned planter (from status transition) and carer details
  const { data: carer } = useQuery({
    queryKey: ['tree-carer', tree.id],
    queryFn: async () => {
      // Find the most recent "assigned" or "sapling_planted" transition for this tree
      const { data: transitions } = await supabase
        .from('tree_status_transitions')
        .select('to_status, transition_data, created_at')
        .eq('tree_id', tree.id)
        .in('to_status', ['assigned', 'sapling_planted'])
        .order('created_at', { ascending: false });

      if (!transitions || transitions.length === 0) return null;

      // Prefer the planted_by from sapling_planted, otherwise assigned_to from assigned
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
    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-card shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <img src={ototTreeIcon} alt="OTOT" className="h-8 w-8" />
          <span className="text-sm font-semibold">Tree is planted by: </span>
          <a href="https://mfc-iclip.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            MFC-ICLIP
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Carousel Content */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* Slide 1: Tree Details */}
          <div className="min-w-full h-full flex flex-col p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">Your tree</h3>
            </div>

            <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden shadow-lg">
              <img src={treeImage} alt="Tree" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-primary/90 text-white px-2 py-1 rounded text-xs font-semibold">
                YOUR TREE
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tree number:</p>
                <p className="text-lg font-bold">{tree.otot_id}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location:
                </p>
                <p className="text-base">Mau Forest Complex (Nakuru)</p>
              </div>

              {tree.latitude && tree.longitude && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Cloud className="h-4 w-4" />
                    Weather:
                  </p>
                  <p className="text-base">23.5°C</p>
                </div>
              )}

              <Button className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white mt-4" size="lg">
                Track this tree
              </Button>
            </div>
          </div>

          {/* Slide 2: Grower Information */}
          <div className="min-w-full h-full flex flex-col p-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">Your tree carer</h3>
            </div>

            <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden shadow-lg bg-muted">
              <img
                src={carerPhoto}
                alt={carerName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = treeCarerImage; }}
              />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold mb-2">{carerName}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {carerDescription}
                </p>
              </div>

              <Button className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white mt-4" size="lg">
                Track this tree
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg p-0"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg p-0"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {[0, 1].map((index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === index ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
