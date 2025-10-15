import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export default function AvailableModules() {
  const { user } = useAuth();

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          roles!inner(name, display_name),
          organizations!inner(*)
        `)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: modules, isLoading } = useQuery({
    queryKey: ["organizationModules", userProfile?.organization_id],
    queryFn: async () => {
      if (!userProfile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from("organization_modules")
        .select(`
          *,
          modules!inner(*)
        `)
        .eq("organization_id", userProfile.organization_id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.organization_id,
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Available Modules</h1>
        <p className="text-muted-foreground mt-1">
          Modules and permissions available to your organization
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <CardTitle className="text-lg">{module.modules.display_name}</CardTitle>
                <CardDescription>{module.modules.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {(module.permissions as string[])?.map((perm) => (
                      <span key={perm} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No modules available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
