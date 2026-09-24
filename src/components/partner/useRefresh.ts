import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";

export function useRefresh(refresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const run = async () => {
    setRefreshing(true);
    try {
      await refresh();
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };
  return { refreshing, lastUpdated, run };
}
