import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Database } from '@/integrations/supabase/types';

type Tree = Database["public"]["Tables"]["trees"]["Row"];

interface TreeMapProps {
  trees: Tree[];
  mapboxToken: string;
  onTreeClick: (tree: Tree) => void;
}

export const TreeMap: React.FC<TreeMapProps> = ({ trees, mapboxToken, onTreeClick }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      zoom: 2,
      center: [20, 0],
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'bottom-right'
    );

    // Add fullscreen control
    map.current.addControl(
      new mapboxgl.FullscreenControl(),
      'top-right'
    );

    return () => {
      markers.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Group trees by location for clustering
    const locationGroups = new Map<string, Tree[]>();
    
    trees.forEach(tree => {
      if (tree.latitude && tree.longitude) {
        const key = `${tree.latitude},${tree.longitude}`;
        const group = locationGroups.get(key) || [];
        group.push(tree);
        locationGroups.set(key, group);
      }
    });

    // Add markers for each location group
    locationGroups.forEach((treesAtLocation, locationKey) => {
      const [lat, lng] = locationKey.split(',').map(Number);
      const count = treesAtLocation.reduce((sum, t) => sum + t.num_trees, 0);

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'tree-marker-cluster';
      el.style.cssText = `
        width: ${count > 99 ? '60px' : '50px'};
        height: ${count > 99 ? '60px' : '50px'};
        background-image: url('/src/assets/otot-tree-icon.png');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        cursor: pointer;
        position: relative;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      `;

      // Add count badge
      const badge = document.createElement('div');
      badge.className = 'tree-count-badge';
      badge.textContent = count.toString();
      badge.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #8BC34A;
        color: white;
        border-radius: 50%;
        width: ${count > 99 ? '32px' : '28px'};
        height: ${count > 99 ? '32px' : '28px'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${count > 99 ? '11px' : '12px'};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      el.appendChild(badge);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Click handler
      el.addEventListener('click', () => {
        // If multiple trees at location, show the first one
        // You could enhance this to show a list
        onTreeClick(treesAtLocation[0]);
      });

      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    if (markers.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      locationGroups.forEach((_, locationKey) => {
        const [lat, lng] = locationKey.split(',').map(Number);
        bounds.extend([lng, lat]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
    }
  }, [trees, onTreeClick]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Instruction Overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm flex items-center gap-2">
        <span className="text-lg">👆</span>
        Click marker on the map to see tree's detail
      </div>

      {/* Tree count overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm font-semibold">
        TOTAL: {trees.reduce((sum, t) => sum + t.num_trees, 0)} trees
      </div>
    </div>
  );
};
