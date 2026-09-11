export type AppRole =
  | "tourist"
  | "super_admin"
  | "ministry_admin"
  | "ministry_user"
  | "partner_admin"
  | "partner_agent";

export type DonationStatus = "pending_payment" | "paid" | "refunded";
export type PaymentStatus = "pending" | "success" | "failed";
export type PaymentMode = "Card" | "M-Pesa" | "Bank Transfer";
export type PlantationRequestStatus =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "ready_for_review"
  | "completed";
export type VendorRequestStatus = "assigned" | "in_progress" | "completed";
export type PayoutStatus = "pending" | "processing" | "paid" | "failed";
export type MinistryRole = "admin" | "user";
export type VendorAgentRole = "admin" | "agent";

export interface TreeLine {
  treeTypeId: string;
  treeType: string;
  count: number;
}

export interface TreeType {
  id: string;
  name: string;
  scientificName: string;
  offsetKg: number;
  costPerTree: number;
  active: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  vendorId?: string;
  ministryRole?: MinistryRole;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  region: string;
  status: "active" | "inactive";
}

export interface VendorAgent {
  id: string;
  userId: string;
  vendorId: string;
  role: VendorAgentRole;
}

export interface Donation {
  id: string;
  userId: string;
  carbonOffsetKg: number;
  amount: number;
  trees: TreeLine[];
  status: DonationStatus;
  createdAt: string;
}

export interface TransactionChargesSplit {
  plantation: number;
  platform: number;
  processor: number;
}

export interface Payment {
  id: string;
  donationId: string;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  amount: number;
  transactionChargesSplit: TransactionChargesSplit;
  createdAt: string;
}

export interface PlantationRequest {
  id: string;
  donationId: string;
  status: PlantationRequestStatus;
  assignedTo?: string;
  partnerId?: string;
  amount: number;
  createdAt: string;
}

export interface PlantationPayout {
  id: string;
  plantationRequestId: string;
  amount: number;
  payoutStatus: PayoutStatus;
  transactionId: string;
  transactionReferenceNumber: string;
  createdAt: string;
}

export interface VendorPlantationRequest {
  id: string;
  plantationRequestId: string;
  vendorId: string;
  assignedAgentId?: string;
  status: VendorRequestStatus;
  createdAt: string;
}

export interface MockSession {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
  vendorId?: string;
}

export interface StoreState {
  version: number;
  users: AppUser[];
  vendors: Vendor[];
  vendorAgents: VendorAgent[];
  treeTypes: TreeType[];
  donations: Donation[];
  payments: Payment[];
  plantationRequests: PlantationRequest[];
  plantationPayouts: PlantationPayout[];
  vendorPlantationRequests: VendorPlantationRequest[];
}
