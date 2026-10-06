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
  AppUser,
  CheckoutMethod,
  Donation,
  Payment,
  Payout,
  PlantationRequest,
  RecipientType,
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
  settings: {
    kesPerUsd: 130,
    chargeFeePct: 2.9,
    payoutFeePct: 0,
    simulationAllowed: false,
    demoResetAllowed: false,
  },
  users: [],
  vendors: [],
  vendorAgents: [],
  treeTypes: [],
  trips: [],
  donations: [],
  payments: [],
  plantationRequests: [],
  paymentAllocations: [],
  payouts: [],
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
    paymentMethod: CheckoutMethod;
    phoneNumber?: string;
    /** One id per Pay attempt; a repeated request returns the first donation. */
    clientRequestId?: string;
  }) => Promise<{ donation: Donation; payment: Payment; checkoutUrl: string }>;
  simulateDonationPayment: (input: {
    carbonOffsetKg: number;
    trees: TreeLine[];
    tripId?: string;
    paymentMethod: CheckoutMethod;
  }) => Promise<{ donation: Donation; payment: Payment; checkoutUrl: string }>;
  getPayment: (paymentId: string) => Promise<Payment>;
  syncPayment: (paymentId: string) => Promise<Payment>;
  simulatePaymentSuccess: (paymentId: string) => Promise<Payment>;
  /** Tourist returned from card checkout with ?cancelled=1. */
  cancelPayment: (paymentId: string) => Promise<Payment>;
  resolvePayment: (
    paymentId: string,
    input: { status: "success" | "failed"; receipt?: string; note: string },
  ) => Promise<Payment>;
  refundPayment: (paymentId: string, reason: string) => Promise<Payment>;
  retryDonationCheckout: (
    donationId: string,
    input: { paymentMethod: CheckoutMethod; phoneNumber?: string },
  ) => Promise<{ donation: Donation; payment: Payment; checkoutUrl: string }>;
  createPlantationRequest: (input: {
    donationId: string;
    partnerId?: string;
  }) => Promise<PlantationRequest>;
  combinePlantationRequests: (requestIds: string[]) => Promise<PlantationRequest>;
  assignPlantationRequest: (requestId: string, partnerId: string, assignedTo: string) => Promise<void>;
  markPlantationComplete: (requestId: string) => Promise<void>;
  /** Ministry sends ready_for_review work back to the partner. */
  reopenPlantationRequest: (requestId: string, reason: string) => Promise<void>;
  createPayout: (plantationRequestId: string) => Promise<Payout>;
  simulatePayoutSuccess: (payoutId: string) => Promise<Payout>;
  payDonationShares: (input: { recipientType: RecipientType; donationIds?: string[] }) => Promise<PayoutBatchResult>;
  resolvePayout: (payoutId: string, input: { status: "transferred" | "failed"; transactionCode?: string; note?: string }) => Promise<Payout>;
  acknowledgePayoutReview: (payoutId: string, note: string) => Promise<Payout>;
  updateFeeSettings: (input: { chargeFeePct: number; payoutFeePct: number }) => Promise<void>;
  createStaffUser: (input: {
    name: string;
    email: string;
    role: StaffRole;
    vendorId?: string;
  }) => Promise<{ user: AppUser; temporaryPassword: string }>;
  setUserActive: (userId: string, active: boolean) => Promise<AppUser>;
  resetUserPassword: (userId: string) => Promise<{ user: AppUser; temporaryPassword: string }>;
  createVendorPlantationRequest: (plantationRequestId: string, assignedAgentId: string) => Promise<void>;
  updateVendorRequestStatus: (id: string, status: VendorRequestStatus) => Promise<void>;
  upsertTreeType: (tree: TreeType) => Promise<void>;
  /** `confirmMpesaPhone` must repeat `vendor.mpesaPhone` when a payout number is set. */
  upsertVendor: (vendor: Vendor, confirmMpesaPhone?: string) => Promise<void>;
}

export type StaffRole = "super_admin" | "ministry_admin" | "ministry_user" | "partner_admin" | "partner_agent";

export interface PayoutBatchResult {
  payouts: Payout[];
  errors: { recipientType: RecipientType; partnerId?: string; message: string }[];
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

  // The write already succeeded; a failed reload must not report it as failed
  // (a retried Pay would charge twice). The next refresh picks it up.
  const afterWrite = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      console.warn("Store refresh after write failed", err);
    }
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
    async (input: {
      carbonOffsetKg: number;
      trees: TreeLine[];
      tripId?: string;
      paymentMethod: CheckoutMethod;
      phoneNumber?: string;
      clientRequestId?: string;
    }) => {
      const data = await apiFetch<{ donation: Donation; payment: Payment; checkoutUrl: string }>(
        "/v1/donations/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            carbonOffsetKg: input.carbonOffsetKg,
            trees: input.trees,
            tripId: input.tripId,
            paymentMethod: input.paymentMethod,
            phoneNumber: input.phoneNumber,
            clientRequestId: input.clientRequestId,
          }),
        },
      );
      await afterWrite();
      return data;
    },
    [afterWrite],
  );

  const simulateDonationPayment = useCallback(
    async (input: {
      carbonOffsetKg: number;
      trees: TreeLine[];
      tripId?: string;
      paymentMethod: CheckoutMethod;
    }) => {
      const data = await apiFetch<{ donation: Donation; payment: Payment; checkoutUrl: string }>(
        "/v1/donations/simulate-payment",
        {
          method: "POST",
          body: JSON.stringify({
            carbonOffsetKg: input.carbonOffsetKg,
            trees: input.trees,
            tripId: input.tripId,
            paymentMethod: input.paymentMethod,
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

  const simulatePaymentSuccess = useCallback(
    async (paymentId: string) => {
      const data = await apiFetch<{ payment: Payment }>(`/v1/payments/${paymentId}/simulate-success`, {
        method: "POST",
      });
      await afterWrite();
      return data.payment;
    },
    [afterWrite],
  );

  const paymentAction = useCallback(
    async (path: string, body?: unknown) => {
      const data = await apiFetch<{ payment: Payment }>(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      await afterWrite();
      return data.payment;
    },
    [afterWrite],
  );

  const cancelPayment = useCallback(
    (paymentId: string) => paymentAction(`/v1/payments/${paymentId}/cancel`),
    [paymentAction],
  );

  const resolvePayment = useCallback(
    (paymentId: string, input: { status: "success" | "failed"; receipt?: string; note: string }) =>
      paymentAction(`/v1/admin/payments/${paymentId}/resolve`, input),
    [paymentAction],
  );

  const refundPayment = useCallback(
    (paymentId: string, reason: string) => paymentAction(`/v1/admin/payments/${paymentId}/refund`, { reason }),
    [paymentAction],
  );

  const retryDonationCheckout = useCallback(
    async (donationId: string, input: { paymentMethod: CheckoutMethod; phoneNumber?: string }) => {
      const data = await apiFetch<{ donation: Donation; payment: Payment; checkoutUrl: string }>(
        `/v1/donations/${donationId}/retry`,
        { method: "POST", body: JSON.stringify(input) },
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

  const combinePlantationRequests = useCallback(async (requestIds: string[]) => {
    const data = await apiFetch<{ request: PlantationRequest }>("/v1/plantation-requests/combine", {
      method: "POST",
      body: JSON.stringify({ requestIds }),
    });
    await afterWrite();
    return data.request;
  }, [afterWrite]);

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

  const reopenPlantationRequest = useCallback(
    async (requestId: string, reason: string) => {
      await apiFetch(`/v1/plantation-requests/${requestId}/reopen`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await afterWrite();
    },
    [afterWrite],
  );

  const createPayout = useCallback(
    async (plantationRequestId: string) => {
      const data = await apiFetch<{ payout: Payout }>("/v1/payouts", {
        method: "POST",
        body: JSON.stringify({ plantationRequestId }),
      });
      await afterWrite();
      return data.payout;
    },
    [afterWrite],
  );

  const simulatePayoutSuccess = useCallback(
    async (payoutId: string) => {
      const data = await apiFetch<{ payout: Payout }>(`/v1/payouts/${payoutId}/simulate-success`, {
        method: "POST",
      });
      await afterWrite();
      return data.payout;
    },
    [afterWrite],
  );

  const payDonationShares = useCallback(
    async (input: { recipientType: RecipientType; donationIds?: string[] }) => {
      try {
        return await apiFetch<PayoutBatchResult>("/v1/admin/payouts", {
          method: "POST",
          body: JSON.stringify(input),
        });
      } finally {
        // A failed transfer still changes share status, so always reload.
        await afterWrite();
      }
    },
    [afterWrite],
  );

  const resolvePayout = useCallback(
    async (payoutId: string, input: { status: "transferred" | "failed"; transactionCode?: string; note?: string }) => {
      const data = await apiFetch<{ payout: Payout }>(`/v1/admin/payouts/${payoutId}/resolve`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await afterWrite();
      return data.payout;
    },
    [afterWrite],
  );

  const acknowledgePayoutReview = useCallback(
    async (payoutId: string, note: string) => {
      const data = await apiFetch<{ payout: Payout }>(`/v1/admin/payouts/${payoutId}/review`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      await afterWrite();
      return data.payout;
    },
    [afterWrite],
  );

  const updateFeeSettings = useCallback(
    async (input: { chargeFeePct: number; payoutFeePct: number }) => {
      await apiFetch("/v1/admin/settings/fees", { method: "PUT", body: JSON.stringify(input) });
      await afterWrite();
    },
    [afterWrite],
  );

  const createStaffUser = useCallback(
    async (input: { name: string; email: string; role: StaffRole; vendorId?: string }) => {
      const data = await apiFetch<{ user: AppUser; temporaryPassword: string }>("/v1/users", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await afterWrite();
      return data;
    },
    [afterWrite],
  );

  const setUserActive = useCallback(
    async (userId: string, active: boolean) => {
      const data = await apiFetch<{ user: AppUser }>(`/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      await afterWrite();
      return data.user;
    },
    [afterWrite],
  );

  const resetUserPassword = useCallback(
    async (userId: string) => {
      const data = await apiFetch<{ user: AppUser; temporaryPassword: string }>(`/v1/users/${userId}/reset-password`, {
        method: "POST",
      });
      await afterWrite();
      return data;
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
    async (vendor: Vendor, confirmMpesaPhone?: string) => {
      await apiFetch("/v1/vendors", {
        method: "PUT",
        body: JSON.stringify({ ...vendor, confirmMpesaPhone }),
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
      simulateDonationPayment,
      getPayment,
      syncPayment,
      simulatePaymentSuccess,
      cancelPayment,
      resolvePayment,
      refundPayment,
      retryDonationCheckout,
      createPlantationRequest,
      combinePlantationRequests,
      assignPlantationRequest,
      markPlantationComplete,
      reopenPlantationRequest,
      createPayout,
      simulatePayoutSuccess,
      payDonationShares,
      resolvePayout,
      acknowledgePayoutReview,
      updateFeeSettings,
      createStaffUser,
      setUserActive,
      resetUserPassword,
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
      simulateDonationPayment,
      getPayment,
      syncPayment,
      simulatePaymentSuccess,
      cancelPayment,
      resolvePayment,
      refundPayment,
      retryDonationCheckout,
      createPlantationRequest,
      combinePlantationRequests,
      assignPlantationRequest,
      markPlantationComplete,
      reopenPlantationRequest,
      createPayout,
      simulatePayoutSuccess,
      payDonationShares,
      resolvePayout,
      acknowledgePayoutReview,
      updateFeeSettings,
      createStaffUser,
      setUserActive,
      resetUserPassword,
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
