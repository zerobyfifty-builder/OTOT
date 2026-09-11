import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeed } from "@/data/seed";
import { nid } from "@/lib/ids";
import { splitCharges } from "@/lib/charges";
import { scoreMix } from "@/lib/treeMix";
import type {
  Donation,
  PaymentMode,
  PlantationPayout,
  PlantationRequest,
  StoreState,
  TreeLine,
  TreeType,
  Vendor,
  VendorRequestStatus,
} from "@/types/otot";

const STORAGE_KEY = "otot.mock-store.v1";

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed?.version === 1 && Array.isArray(parsed.donations)) return parsed;
    }
  } catch {
    /* ignore corrupt cache */
  }
  return createSeed();
}

interface StoreContextValue {
  state: StoreState;
  resetDemo: () => void;
  createTourist: (name: string, email: string) => StoreState["users"][number];
  checkoutDonation: (input: {
    userId: string;
    carbonOffsetKg: number;
    trees: TreeLine[];
    paymentMode: PaymentMode;
  }) => { donation: Donation };
  createPlantationRequest: (input: {
    donationId: string;
    partnerId?: string;
  }) => PlantationRequest;
  assignPlantationRequest: (requestId: string, partnerId: string, assignedTo: string) => void;
  markPlantationComplete: (requestId: string) => void;
  createPayout: (plantationRequestId: string) => PlantationPayout;
  createVendorPlantationRequest: (plantationRequestId: string, assignedAgentId: string) => void;
  updateVendorRequestStatus: (id: string, status: VendorRequestStatus) => void;
  upsertTreeType: (tree: TreeType) => void;
  upsertVendor: (vendor: Vendor) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const resetDemo = useCallback(() => {
    const next = createSeed();
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const createTourist = useCallback((name: string, email: string) => {
    const user: StoreState["users"][number] = {
      id: nid(),
      email: email.trim().toLowerCase(),
      name,
      role: "tourist",
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, users: [...prev.users, user] }));
    return user;
  }, []);

  const checkoutDonation = useCallback(
    (input: {
      userId: string;
      carbonOffsetKg: number;
      trees: TreeLine[];
      paymentMode: PaymentMode;
    }) => {
      const mix = scoreMix(input.trees, state.treeTypes);
      const donation: Donation = {
        id: nid(),
        userId: input.userId,
        carbonOffsetKg: input.carbonOffsetKg,
        amount: mix.amount,
        trees: mix.trees,
        status: "paid",
        createdAt: new Date().toISOString(),
      };
      const payment = {
        id: nid(),
        donationId: donation.id,
        paymentMode: input.paymentMode,
        status: "success" as const,
        amount: mix.amount,
        transactionChargesSplit: splitCharges(mix.amount),
        createdAt: donation.createdAt,
      };
      setState((prev) => ({
        ...prev,
        donations: [donation, ...prev.donations],
        payments: [payment, ...prev.payments],
      }));
      return { donation };
    },
    [state.treeTypes],
  );

  const createPlantationRequest = useCallback(
    (input: { donationId: string; partnerId?: string }) => {
      const donation = state.donations.find((d) => d.id === input.donationId);
      if (!donation) throw new Error("Donation not found");
      const existing = state.plantationRequests.find((r) => r.donationId === input.donationId);
      if (existing) return existing;

      const partner = input.partnerId
        ? state.vendors.find((v) => v.id === input.partnerId)
        : undefined;
      const admin = partner
        ? state.users.find((u) => u.vendorId === partner.id && u.role === "partner_admin")
        : undefined;

      const request: PlantationRequest = {
        id: nid(),
        donationId: donation.id,
        status: partner ? "assigned" : "unassigned",
        assignedTo: admin?.id,
        partnerId: partner?.id,
        amount: donation.amount,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        plantationRequests: [request, ...prev.plantationRequests],
      }));
      return request;
    },
    [state.donations, state.plantationRequests, state.users, state.vendors],
  );

  const assignPlantationRequest = useCallback(
    (requestId: string, partnerId: string, assignedTo: string) => {
      setState((prev) => ({
        ...prev,
        plantationRequests: prev.plantationRequests.map((r) =>
          r.id === requestId
            ? { ...r, partnerId, assignedTo, status: r.status === "unassigned" ? "assigned" : r.status }
            : r,
        ),
      }));
    },
    [],
  );

  const markPlantationComplete = useCallback((requestId: string) => {
    setState((prev) => {
      const vprs = prev.vendorPlantationRequests.filter((v) => v.plantationRequestId === requestId);
      const allDone = vprs.length > 0 && vprs.every((v) => v.status === "completed");
      if (!allDone) return prev;
      return {
        ...prev,
        plantationRequests: prev.plantationRequests.map((r) =>
          r.id === requestId ? { ...r, status: "completed" } : r,
        ),
      };
    });
  }, []);

  const createPayout = useCallback(
    (plantationRequestId: string) => {
      const request = state.plantationRequests.find((r) => r.id === plantationRequestId);
      if (!request) throw new Error("Request not found");
      const existing = state.plantationPayouts.find((p) => p.plantationRequestId === plantationRequestId);
      if (existing) return existing;
      const split = splitCharges(request.amount);
      const payout: PlantationPayout = {
        id: nid(),
        plantationRequestId,
        amount: split.plantation,
        payoutStatus: "paid",
        transactionId: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        transactionReferenceNumber: `KTB-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        plantationPayouts: [payout, ...prev.plantationPayouts],
      }));
      return payout;
    },
    [state.plantationPayouts, state.plantationRequests],
  );

  const createVendorPlantationRequest = useCallback(
    (plantationRequestId: string, assignedAgentId: string) => {
      setState((prev) => {
        if (prev.vendorPlantationRequests.some((v) => v.plantationRequestId === plantationRequestId)) {
          return prev;
        }
        const request = prev.plantationRequests.find((r) => r.id === plantationRequestId);
        if (!request?.partnerId) return prev;
        return {
          ...prev,
          vendorPlantationRequests: [
            {
              id: nid(),
              plantationRequestId,
              vendorId: request.partnerId,
              assignedAgentId,
              status: "assigned",
              createdAt: new Date().toISOString(),
            },
            ...prev.vendorPlantationRequests,
          ],
          plantationRequests: prev.plantationRequests.map((r) =>
            r.id === plantationRequestId ? { ...r, status: "in_progress" } : r,
          ),
        };
      });
    },
    [],
  );

  const updateVendorRequestStatus = useCallback((id: string, status: VendorRequestStatus) => {
    setState((prev) => {
      const vpr = prev.vendorPlantationRequests.find((v) => v.id === id);
      if (!vpr) return prev;
      const nextVprs = prev.vendorPlantationRequests.map((v) => (v.id === id ? { ...v, status } : v));
      const siblings = nextVprs.filter((v) => v.plantationRequestId === vpr.plantationRequestId);
      const allDone = siblings.length > 0 && siblings.every((v) => v.status === "completed");
      return {
        ...prev,
        vendorPlantationRequests: nextVprs,
        plantationRequests: prev.plantationRequests.map((r) =>
          r.id === vpr.plantationRequestId
            ? { ...r, status: allDone ? "ready_for_review" : "in_progress" }
            : r,
        ),
      };
    });
  }, []);

  const upsertTreeType = useCallback((tree: TreeType) => {
    setState((prev) => {
      const exists = prev.treeTypes.some((t) => t.id === tree.id);
      return {
        ...prev,
        treeTypes: exists
          ? prev.treeTypes.map((t) => (t.id === tree.id ? tree : t))
          : [...prev.treeTypes, tree],
      };
    });
  }, []);

  const upsertVendor = useCallback((vendor: Vendor) => {
    setState((prev) => {
      const exists = prev.vendors.some((v) => v.id === vendor.id);
      return {
        ...prev,
        vendors: exists
          ? prev.vendors.map((v) => (v.id === vendor.id ? vendor : v))
          : [...prev.vendors, vendor],
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      state,
      resetDemo,
      createTourist,
      checkoutDonation,
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
      resetDemo,
      createTourist,
      checkoutDonation,
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
