import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, MapPin, ArrowLeft, Upload } from "lucide-react";

export const PlantTree = () => {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const { lodge } = useLodgeAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [treeType, setTreeType] = useState("");
  const [plantDate, setPlantDate] = useState(new Date().toISOString().split('T')[0]);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [gettingLocation, setGettingLocation] = useState(false);

  const { data: tree } = useQuery({
    queryKey: ['tree', treeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trees')
        .select('*')
        .eq('id', treeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!treeId,
  });

  useEffect(() => {
    if (tree) {
      setTreeType(tree.tree_type || "");
      setPlantDate(tree.plant_date || new Date().toISOString().split('T')[0]);
      setLatitude(tree.latitude?.toString() || "");
      setLongitude(tree.longitude?.toString() || "");
      setLocationName(tree.location_name || "");
      setGrowthNotes(tree.growth_notes || "");
    }
  }, [tree]);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
          setGettingLocation(false);
          toast({
            title: "Location captured",
            description: "GPS coordinates have been recorded",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setGettingLocation(false);
          toast({
            title: "Location error",
            description: "Could not get GPS location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    } else {
      setGettingLocation(false);
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tree) return;

      let imageUrl = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${tree.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('lodge-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('lodge-photos')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const existingImages = tree.images ? (Array.isArray(tree.images) ? tree.images : [tree.images]) : [];
      const updatedImages = imageUrl ? [...existingImages, imageUrl] : existingImages;

      const { error } = await supabase
        .from('trees')
        .update({
          tree_type: treeType,
          plant_date: plantDate,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          location_name: locationName,
          growth_notes: growthNotes,
          status: 'Planted',
          images: updatedImages,
        })
        .eq('id', treeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
      queryClient.invalidateQueries({ queryKey: ['lodge-tourist-trees'] });
      toast({
        title: "Success",
        description: "Tree planting recorded successfully",
      });
      navigate('/lodge/dashboard');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update tree information",
        variant: "destructive",
      });
      console.error('Update error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/lodge/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Plant Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="treeType">Tree Type</Label>
                <Input
                  id="treeType"
                  value={treeType}
                  onChange={(e) => setTreeType(e.target.value)}
                  placeholder="e.g., Acacia, Baobab"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plantDate">Planting Date</Label>
                <Input
                  id="plantDate"
                  type="date"
                  value={plantDate}
                  onChange={(e) => setPlantDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>GPS Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {gettingLocation ? 'Getting location...' : 'Capture GPS Location'}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                  <Input
                    placeholder="Longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Near main entrance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Planting Photo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    capture="environment"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" asChild>
                    <label htmlFor="photo" className="cursor-pointer">
                      <Camera className="w-4 h-4" />
                    </label>
                  </Button>
                </div>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mt-2 rounded-lg max-h-48 object-cover"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Growth Notes</Label>
                <Textarea
                  id="notes"
                  value={growthNotes}
                  onChange={(e) => setGrowthNotes(e.target.value)}
                  placeholder="Add any observations or notes about the tree"
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Submitting...' : 'Submit Tree Planting'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
