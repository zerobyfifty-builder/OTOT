import { useEffect, useRef, useState } from "react";
import { X, Download, MapPin, Calendar, Leaf } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { generateTreeCertificate, downloadCertificate } from "@/utils/certificateGenerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TreeStatus = Database["public"]["Enums"]["tree_status_type"];

interface TreeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: {
    id: string;
    num_trees: number;
    location_name: string | null;
    latitude: number | null;
    longitude: number | null;
    status: TreeStatus;
    plant_date: string | null;
    images: any;
    otot_id: string;
    tree_type: string | null;
    created_at: string;
  };
  mapboxToken: string;
}

const STATUS_COLORS: Record<TreeStatus, string> = {
  "Waiting to be Assigned": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Assigned": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Sapling Planted": "bg-green-500/10 text-green-700 border-green-500/20",
  "Location Mapped": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Planted": "bg-accent/10 text-accent border-accent/20",
};

export const TreeDetailsModal = ({ isOpen, onClose, tree, mapboxToken }: TreeDetailsModalProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (tree.images && Array.isArray(tree.images)) {
      setImages(tree.images as string[]);
    }
  }, [tree.images]);

  useEffect(() => {
    if (!isOpen || !mapContainer.current || !tree.latitude || !tree.longitude || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [tree.longitude, tree.latitude],
      zoom: 14,
    });

    // Add marker
    new mapboxgl.Marker({ color: "#4ade80" })
      .setLngLat([tree.longitude, tree.latitude])
      .addTo(map.current);

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, [isOpen, tree.latitude, tree.longitude, mapboxToken]);

  const handleDownloadCertificate = async () => {
    try {
      // Get user details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to download certificate');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('email, otot_id')
        .eq('user_id', user.id)
        .single();

      // Generate and download certificate
      const certificateBlob = await generateTreeCertificate({
        userName: userData?.email || 'Environmental Supporter',
        userId: user.id,
        numTrees: tree.num_trees,
        co2Offset: tree.num_trees * 22, // Approximate annual offset per tree
        ototId: userData?.otot_id || tree.otot_id,
        location: tree.location_name || undefined,
      });

      downloadCertificate(
        certificateBlob, 
        `tree-certificate-${tree.otot_id}.pdf`
      );

      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-2xl">Tree Details - {tree.otot_id}</span>
            <Badge className={STATUS_COLORS[tree.status]}>{tree.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Number of Trees</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                {tree.num_trees}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {tree.location_name || "Pending"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plant Date</p>
              <p className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {tree.plant_date ? format(new Date(tree.plant_date), "dd MMM yyyy") : "Pending"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tree Type</p>
              <p className="text-xl font-semibold">
                {tree.tree_type || "To be determined"}
              </p>
            </div>
          </div>

          {/* Map */}
          {tree.latitude && tree.longitude && mapboxToken ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Location Map</h3>
              <div ref={mapContainer} className="w-full h-[400px] rounded-lg" />
              <p className="text-sm text-muted-foreground">
                Coordinates: {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {mapboxToken ? "Location data not available yet" : "Map requires Mapbox token"}
              </p>
            </div>
          )}

          {/* Photo Gallery */}
          {images.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Photo Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Tree photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-8 text-center">
              <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Photos will be added once the tree is planted</p>
            </div>
          )}

          {/* Growth Timeline */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Growth Progress</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div className="flex-1">
                  <p className="font-medium">Purchased</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(tree.created_at), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
              {tree.status !== "Waiting to be Assigned" && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">Assigned to Project</p>
                    <p className="text-sm text-muted-foreground">{tree.location_name}</p>
                  </div>
                </div>
              )}
              {tree.plant_date && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">Planted</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tree.plant_date), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleDownloadCertificate} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
