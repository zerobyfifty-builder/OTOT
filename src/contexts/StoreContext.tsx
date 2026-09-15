import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import type {
  Donation,
  Payment,
  PlantationPayout,
  PlantationRequest,
  StoreState,
  TreeLine,
  TreeType,
  Trip,
  CreateTripInput,
  Vendor,
  VendorRequestStatus,
} from "@/types/otot";

const emptyStore = (): StoreState => ({
  version: 1,
  users: [],
  vendors: [],
  vendorAgents: [],
  treeTypes: [],
  trips: [],
  donations: [],
  payments: [],
  plantationRequests: [],
  plantationPayouts: [],
  vendorPlantationRequests: [],
});

interface TreeMixQuote {
  trees: TreeLine[];
  amount: number;
  offsetKg: number;
}

interface StoreContextValue {
  state: StoreState;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  resetDemo: () => Promise<void>;
  quoteTreeMix: (carbonOffsetKg: number) => Promise<TreeMixQuote>;
  createTrip: (input: CreateTripInput) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;
  checkoutDonation: (input: {
    carbonOffsetKg: number;
    trees: TreeLine[];
    tripId?: string;
    phoneNumber: string;
  }) => Promise<{ donation: Donation; payment: Payment; checkoutUrl: string }>;
  getPayment: (paymentId: string) => Promise<Payment>;
  syncPayment: (paymentId: string) => Promise<Payment>;
  retryDonationCheckout: (
    donationId: string,
    phoneNumber: string,
  ) => Promise<{ donation: Donation; payment: Payment; checkoutUrl: string }>;
  createPlantationRequest: (input: {
    donationId: string;
    partnerId?: string;
  }) => Promise<PlantationRequest>;
  assignPlantationRequest: (requestId: string, partnerId: string, assignedTo: string) => Promise<void>;
  markPlantationComplete: (requestId: string) => Promise<void>;
  createPayout: (plantationRequestId: string) => Promise<PlantationPayout>;
  createVendorPlantationRequest: (plantationRequestId: string, assignedAgentId: string) => Promise<void>;
  updateVendorRequestStatus: (id: string, status: VendorRequestStatus) => Promise<void>;
  upsertTreeType: (tree: TreeType) => Promise<void>;
  upsertVendor: (vendor: Vendor) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [state, setState] = useState<StoreState>(emptyStore);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await apiFetch<StoreState>("/v1/store");
    setState(next);
    setError(null);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(emptyStore());
      setLoadedUserId(null);
      setError(null);
      return;
    }

    let cancelled = false;
    apiFetch<StoreState>("/v1/store")
      .then((next) => {
        if (cancelled) return;
        setState(next);
        setLoadedUserId(session.userId);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState(emptyStore());
        setLoadedUserId(session.userId);
        setError(err instanceof Error ? err.message : "Could not load OTOT data.");
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, session]);

  const loading = authLoading || Boolean(session && loadedUserId !== session.userId);

  const afterWrite = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const resetDemo = useCallback(async () => {
    await apiFetch("/v1/admin/reset-demo", { method: "POST" });
    await afterWrite();
  }, [afterWrite]);

  const quoteTreeMix = useCallback(async (carbonOffsetKg: number) => {
    return apiFetch<TreeMixQuote>("/v1/tree-mix/quote", {
      method: "POST",
      body: JSON.stringify({ carbonOffsetKg }),
    });
  }, []);

  const createTrip = useCallback(
    async (input: CreateTripInput) => {
      const data = await apiFetch<{ trip: Trip }>("/v1/trips", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await afterWrite();
      return data.trip;
    },
    [afterWrite],
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      await apiFetch(`/v1/trips/${tripId}`, { method: "DELETE" });
      await afterWrite();
    },
    [afterWrite],
  );

  const checkoutDonation = useCallback(
    async (input: { carbonOffsetKg: number; trees: TreeLine[]; tripId?: string; phoneNumber: string }) => {
      const data = await apiFetch<{ donation: Donation; payment: Payment; checkoutUrl: string }>(
        "/v1/donations/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            carbonOffsetKg: input.carbonOffsetKg,
            trees: input.trees,
            tripId: input.tripId,
            phoneNumber: input.phoneNumber,
          }),
        },
      );
      await afterWrite();
      return data;
    },
    [afterWrite],
  );

  const getPayment = useCallback(async (paymentId: string) => {
    const data = await apiFetch<{ payment: Payment }>(`/v1/payments/${paymentId}`);
    return data.payment;
  }, []);

  const syncPayment = useCallback(async (paymentId: string) => {
    const data = await apiFetch<{ payment: Payment }>(`/v1/payments/${paymentId}/sync`, { method: "POST" });
    return data.payment;
  }, []);

  const retryDonationCheckout = useCallback(
    async (donationId: string, phoneNumber: string) => {
      const data = await apiFetch<{ donation: Donation; payment: Payment; checkoutUrl: string }>(
        `/v1/donations/${donationId}/retry`,
        { method: "POST", body: JSON.stringify({ phoneNumber }) },
      );
      await afterWrite();
      return data;
    },
    [afterWrite],
  );

  const createPlantationRequest = useCallback(
    async (input: { donationId: string; partnerId?: string }) => {
      const data = await apiFetch<{ request: PlantationRequest }>("/v1/plantation-requests", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await afterWrite();
      return data.request;
    },
    [afterWrite],
  );

  const assignPlantationRequest = useCallback(
    async (requestId: string, partnerId: string, assignedTo: string) => {
      await apiFetch(`/v1/plantation-requests/${requestId}/assign`, {
        method: "POST",
        body: JSON.stringify({ partnerId, assignedTo }),
      });
      await afterWrite();
    },
    [afterWrite],
  );

  const markPlantationComplete = useCallback(
    async (requestId: string) => {
      await apiFetch(`/v1/plantation-requests/${requestId}/complete`, { method: "POST" });
      await afterWrite();
    },
    [afterWrite],
  );

  const createPayout = useCallback(
    async (plantationRequestId: string) => {
      const data = await apiFetch<{ payout: PlantationPayout }>("/v1/payouts", {
        method: "POST",
        body: JSON.stringify({ plantationRequestId }),
      });
      await afterWrite();
      return data.payout;
    },
    [afterWrite],
  );

  const createVendorPlantationRequest = useCallback(
    async (plantationRequestId: string, assignedAgentId: string) => {
      await apiFetch("/v1/vendor-plantation-requests", {
        method: "POST",
        body: JSON.stringify({ plantationRequestId, assignedAgentId }),
      });
      await afterWrite();
    },
    [afterWrite],
  );

  const updateVendorRequestStatus = useCallback(
    async (id: string, status: VendorRequestStatus) => {
      await apiFetch(`/v1/vendor-plantation-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await afterWrite();
    },
    [afterWrite],
  );

  const upsertTreeType = useCallback(
    async (tree: TreeType) => {
      await apiFetch("/v1/tree-types", {
        method: "PUT",
        body: JSON.stringify(tree),
      });
      await afterWrite();
    },
    [afterWrite],
  );

  const upsertVendor = useCallback(
    async (vendor: Vendor) => {
      await apiFetch("/v1/vendors", {
        method: "PUT",
        body: JSON.stringify(vendor),
      });
      await afterWrite();
    },
    [afterWrite],
  );

  const value = useMemo(
    () => ({
      state,
      loading,
      error,
      refresh,
      resetDemo,
      quoteTreeMix,
      createTrip,
      deleteTrip,
      checkoutDonation,
      getPayment,
      syncPayment,
      retryDonationCheckout,
      createPlantationRequest,
      assignPlantationRequest,
      markPlantationComplete,
      createPayout,
      createVendorPlantationRequest,
      updateVendorRequestStatus,
      upsertTreeType,
      upsertVendor,
    }),
    [
      state,
      loading,
      error,
      refresh,
      resetDemo,
      quoteTreeMix,
      createTrip,
      deleteTrip,
      checkoutDonation,
      getPayment,
      syncPayment,
      retryDonationCheckout,
      createPlantationRequest,
      assignPlantationRequest,
      markPlantationComplete,
      createPayout,
      createVendorPlantationRequest,
      updateVendorRequestStatus,
      upsertTreeType,
      upsertVendor,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
