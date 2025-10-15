import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TreesTable } from "@/components/institutional/TreesTable";

export default function RecentTrees() {
  const { data: recentTrees, isLoading: treesLoading } = useQuery({
    queryKey: ["recentTrees"],
    queryFn: async () => {
      const { data: trees, error } = await supabase
        .from("trees")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!trees) return [];

      // Fetch user emails for these trees
      const userIds = [...new Set(trees.map(t => t.user_id))];
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", userIds);

      return trees.map(tree => ({
        ...tree,
        user_email: users?.find(u => u.user_id === tree.user_id)?.email || "Unknown"
      }));
    },
    refetchInterval: 30000,
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recent Tree Plantings</h1>
        <p className="text-muted-foreground mt-1">
          Latest tree planting activities and status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Recent Trees</CardTitle>
          <CardDescription>Tree planting records with current status</CardDescription>
        </CardHeader>
        <CardContent>
          <TreesTable trees={recentTrees || []} isLoading={treesLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
