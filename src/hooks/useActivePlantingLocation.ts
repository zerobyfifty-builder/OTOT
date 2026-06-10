import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlantingLocation {
  id: string;
  planted_by_name: string;
  planted_by_description: string | null;
  site_name: string;
  site_description: string | null;
  site_url: string | null;
  photo_url: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  is_active: boolean;
  show_in_tourist: boolean;
  sort_order: number;
}

export function useTouristPlantingLocation() {
  return useQuery({
    queryKey: ["tourist-planting-location"],
    queryFn: async (): Promise<PlantingLocation | null> => {
      const { data, error } = await supabase
        .from("planting_locations")
        .select("*")
        .eq("is_active", true)
        .eq("show_in_tourist", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlantingLocation | null;
    },
  });
}

export function useActivePlantingLocation() {
  return useQuery({
    queryKey: ["active-planting-location"],
    queryFn: async (): Promise<PlantingLocation | null> => {
      const { data, error } = await supabase
        .from("planting_locations")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlantingLocation | null;
    },
  });
}

export function usePlantingLocations() {
  return useQuery({
    queryKey: ["planting-locations"],
    queryFn: async (): Promise<PlantingLocation[]> => {
      const { data, error } = await supabase
        .from("planting_locations")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlantingLocation[];
    },
  });
}
