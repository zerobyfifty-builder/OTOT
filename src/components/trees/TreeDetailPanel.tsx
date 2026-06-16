import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Cloud, ExternalLink, RefreshCw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTouristPlantingLocation } from '@/hooks/useActivePlantingLocation';

import yourTreeImage from '@/assets/your-tree-demo.png';
import treeCarerImage from '@/assets/tree-carer-demo.png';

type Tree = Database["public"]["Tables"]["trees"]["Row"];

interface TreeDetailPanelProps {
  tree: Tree;
  onClose: () => void;
}

export const TreeDetailPanel: React.FC<TreeDetailPanelProps> = ({ tree, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mapKey, setMapKey] = useState(0);
  const tabs = ['Your Tree', 'Your Tree Carer', 'Location', 'Impact'];
  const slideCount = tabs.length;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slideCount);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);

  const treeImages = Array.isArray(tree.images) ? tree.images : [];
  const localTreeImage = treeImages.length > 0 ? (typeof treeImages[0] === 'string' ? treeImages[0] : (treeImages[0] as any)?.url) : null;

  // Fallback: planting photo captured by plantation partner when status -> sapling_planted
  const { data: plantingPhoto } = useQuery({
    queryKey: ['tree-planting-photo', tree.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tree_status_transitions')
        .select('photos, created_at')
        .eq('tree_id', tree.id)
        .eq('to_status', 'sapling_planted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const photos = (data as any)?.photos;
      if (Array.isArray(photos) && photos.length > 0) {
        return typeof photos[0] === 'string' ? photos[0] : (photos[0] as any)?.url ?? null;
      }
      return null;
    },
    enabled: !!tree.id,
  });

  const actualTreeImage = localTreeImage || plantingPhoto || null;
  const hasActualPhoto = !!actualTreeImage;
  const treeImage = actualTreeImage || yourTreeImage;

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

  const { data: geotag } = useQuery({
    queryKey: ['tree-geotag', tree.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tree_geotags' as any)
        .select('latitude, longitude, geo_tag_id, geo_accuracy')
        .eq('tree_id', tree.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) return data as any;

      // Fallback: latest status transition that captured a geotag
      // (plantation portal writes lat/lng/geo_tag_id into transition_data
      //  when status moves to being_mapped / location_mapped).
      const { data: transitions } = await supabase
        .from('tree_status_transitions')
        .select('to_status, transition_data, created_at')
        .eq('tree_id', tree.id)
        .order('created_at', { ascending: false });

      for (const t of transitions || []) {
        const td = (t.transition_data as Record<string, any>) || {};
        if (td.latitude != null && td.longitude != null) {
          return {
            latitude: Number(td.latitude),
            longitude: Number(td.longitude),
            geo_tag_id: td.geo_tag_id ?? null,
            geo_accuracy: td.geo_accuracy ?? null,
          } as any;
        }
      }
      return null;
    },
    enabled: !!tree.id,
  });

  const { data: latestStatus } = useQuery({
    queryKey: ['tree-latest-status', tree.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tree_status_transitions')
        .select('to_status, created_at')
        .eq('tree_id', tree.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!tree.id,
  });

  const statusLabel = (latestStatus?.to_status || tree.planting_status || tree.status || 'pending')
    .toString()
    .replace(/_/g, ' ');
  const statusDate = latestStatus?.created_at || tree.plant_date || tree.updated_at || tree.created_at;

  const lat = geotag?.latitude ?? tree.latitude;
  const lng = geotag?.longitude ?? tree.longitude;
  const hasLocation = lat != null && lng != null;

  // Fetch the assigned beat label (from latest 'assigned' transition)
  const { data: assignedBeatLabel } = useQuery({
    queryKey: ['tree-assigned-beat', tree.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tree_status_transitions')
        .select('transition_data, created_at')
        .eq('tree_id', tree.id)
        .eq('to_status', 'assigned')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const td = (data as any)?.transition_data || {};
      return (td.target_beat_label as string) || null;
    },
    enabled: !!tree.id,
  });

  // Active "planted here" location from Super Admin config
  const { data: plantingLocation } = useTouristPlantingLocation();
  const plantedHereLocation = plantingLocation?.site_name || 'Mau Forest Complex';
  const treeLocation = assignedBeatLabel || plantedHereLocation;



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
        {/* Header + Tabs */}
        <div className="px-4 pt-5 pb-3 pr-12 bg-gradient-to-br from-primary/5 via-background to-background shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium text-foreground">
              {plantedHereLocation}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {statusLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              {statusDate
                ? new Date(statusDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-full overflow-x-auto bg-[hsl(142_60%_90%/0.6)] backdrop-blur-xl border border-[hsl(142_76%_36%/0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-sm:bg-[hsl(142_60%_93%/0.82)]">
            {tabs.map((label, idx) => (
              <button
                key={label}
                onClick={() => setCurrentSlide(idx)}
                className={`min-w-max px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-full transition-all ${
                  currentSlide === idx
                    ? 'no-glass bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
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
              <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden shadow-lg bg-muted">
                <img
                  src={treeImage}
                  alt="Tree"
                  className={`w-full h-full object-cover ${hasActualPhoto ? '' : 'blur-[2px] brightness-90'}`}
                />
                {!hasActualPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className="text-center text-sm font-semibold text-foreground bg-background/85 backdrop-blur-sm px-4 py-2 rounded-md shadow">
                      Your tree photo will appear here once it is planted
                    </p>
                  </div>
                )}
                {hasActualPhoto && (
                  <div className="absolute top-2 right-2 bg-primary/90 text-white px-2 py-1 rounded text-xs font-semibold">
                    YOUR TREE
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Tree ID:</p>
                    <p className="text-sm font-bold truncate">{tree.otot_id}</p>
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
                  <p className="text-sm">{treeLocation}</p>
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
              <div className="relative w-full aspect-square mb-6 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={carerPhoto}
                  alt={carerName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = treeCarerImage; }}
                />
              </div>

              <div className="space-y-2">
                <p className="text-base font-bold">{carerName}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {carerDescription}
                </p>
              </div>
            </div>

            {/* Slide 3: Location */}
            <div className="min-w-full h-full overflow-y-auto px-5 pt-3 pb-16">
              {hasLocation ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Tree Geotag & Map
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs h-7 px-2.5 rounded-md border bg-background hover:bg-accent"
                    >
                      <ExternalLink className="h-3 w-3 mr-1.5" /> Open in Google Maps
                    </a>
                  </div>

                  <div className="rounded-md border bg-muted/30 overflow-hidden" style={{ height: 280 }}>
                    <div className="relative h-full">
                      <iframe
                        key={mapKey}
                        title="Tree location map"
                        src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed&t=${mapKey}`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 shadow-md"
                          onClick={() => setMapKey((k) => k + 1)}
                          title="Refresh map"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Expand"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm pt-1">
                    <span className="text-muted-foreground">Forest:</span>
                    <span className="font-medium">Mau Forest Complex (Nakuru)</span>
                    <span className="text-muted-foreground">Latitude:</span>
                    <span className="font-medium">{lat}</span>
                    <span className="text-muted-foreground">Longitude:</span>
                    <span className="font-medium">{lng}</span>
                    {geotag?.geo_accuracy != null && (
                      <>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="font-medium">{geotag.geo_accuracy} m</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 py-10 px-4 text-center">
                  <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No geotag captured yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Location will appear here once your tree is mapped.</p>
                </div>
              )}
            </div>

            {/* Slide 4: Impact */}
            <div className="min-w-full h-full overflow-y-auto px-5 pt-3 pb-16">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">CO₂ absorbed / year</p>
                  <p className="text-lg font-bold">22 kg</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Oxygen produced / year</p>
                  <p className="text-lg font-bold">118 kg</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Lifetime CO₂</p>
                  <p className="text-lg font-bold">~1 ton</p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">Wildlife supported</p>
                  <p className="text-lg font-bold">Yes</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                Your tree contributes to restoring the Mau Forest ecosystem, supporting biodiversity, watershed health, and local livelihoods.
              </p>
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
            {Array.from({ length: slideCount }, (_, i) => i).map((index) => (
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
