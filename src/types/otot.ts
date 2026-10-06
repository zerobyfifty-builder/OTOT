export type AppRole =
  | "tourist"
  | "super_admin"
  | "ministry_admin"
  | "ministry_user"
  | "partner_admin"
  | "partner_agent";

export type DonationStatus = "pending_payment" | "paid" | "refunded";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
/** A payment that needs a Super Admin decision. */
export type PaymentIssue = "duplicate" | "amount_mismatch" | "reversed";
export type PaymentMode = "Card" | "M-Pesa" | "Bank Transfer";
export type CheckoutMethod = "mpesa" | "card";
export type PlantationRequestStatus =
  | "unassigned"
  | "assigned"
  | "in_progress"
  | "ready_for_review"
  | "completed";
export type VendorRequestStatus = "assigned" | "in_progress" | "completed";
export type PayoutStatus = "initiated" | "in_progress" | "transferred" | "failed";
/** `void`: never payable (test money, refunded or reversed payments). */
export type AllocationStatus = "pending" | "void" | PayoutStatus;
export type RecipientType = "otot" | "ministry" | "partner";
export type PayoutSource = "manual" | "ministry" | "auto_per_transaction" | "auto_daily" | "legacy";
export type MinistryRole = "admin" | "user";
export type VendorAgentRole = "admin" | "agent";
export type TravelClass = "economy" | "premium_economy" | "business" | "first";
export type AccommodationType = "none" | "hotel" | "rental" | "cruise" | "service_apartment";
export type TripEntrySource = "Manual" | "Partner";

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
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  region: string;
  status: "active" | "inactive";
  mpesaPhone?: string;
}

export interface VendorAgent {
  id: string;
  userId: string;
  vendorId: string;
  role: VendorAgentRole;
}

export interface Trip {
  id: string;
  userId: string;
  originAirport: string;
  destinationAirport: string;
  travelClass: TravelClass;
  isReturn: boolean;
  fromDate: string;
  toDate: string;
  accommodationType: AccommodationType;
  numTravelers: number;
  flightCo2: number;
  accommodationCo2: number;
  totalCo2: number;
  treesNeeded: number;
  distanceKm?: number;
  /** Shown instead of origin → destination, e.g. "Flight time: 8h" or a multi-city route. */
  routeLabel?: string;
  entrySource: TripEntrySource;
  friendlyTripId: string;
  createdAt: string;
}

export type CreateTripInput = Omit<Trip, "id" | "userId" | "entrySource" | "friendlyTripId" | "createdAt">;

export interface Donation {
  id: string;
  userId: string;
  tripId?: string;
  carbonOffsetKg: number;
  requestedCarbonOffsetKg?: number;
  amount: number;
  trees: TreeLine[];
  status: DonationStatus;
  /** When the payment that funded it was confirmed. */
  paidAt?: string;
  createdAt: string;
}

export interface TransactionChargesSplit {
  plantation: number;
  platform: number;
  ministry: number;
  processor: number;
}

export interface Payment {
  id: string;
  donationId: string;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  amount: number;
  transactionChargesSplit: TransactionChargesSplit;
  externalReference?: string;
  afrinetTransactionCode?: string;
  afrinetStatus?: string;
  checkoutUrl?: string;
  mpesaReceipt?: string;
  failureMessage?: string;
  currency?: string;
  amountKes?: number;
  feeKes?: number;
  payoutFeeKes?: number;
  kesPerUsd?: number;
  simulated: boolean;
  issue?: PaymentIssue;
  resolutionNote?: string;
  createdAt: string;
}

export interface PlantationRequest {
  id: string;
  donationId: string;
  donationIds: string[];
  status: PlantationRequestStatus;
  assignedTo?: string;
  partnerId?: string;
  amount: number;
  /** Why the Ministry sent reported work back. */
  reviewNote?: string;
  createdAt: string;
}

/** One recipient's whole-KES share of a successful payment. */
export interface PaymentAllocation {
  id: string;
  paymentId: string;
  donationId: string;
  recipientType: RecipientType;
  partnerId?: string;
  amountKes: number;
  status: AllocationStatus;
  payoutId?: string;
  createdAt: string;
}

/** One M-Pesa B2C transfer that settles one or more allocations. */
export interface Payout {
  id: string;
  recipientType: RecipientType;
  partnerId?: string;
  recipientName: string;
  mpesaPhone?: string;
  amountKes: number;
  status: PayoutStatus;
  source: PayoutSource;
  reference: string;
  transactionCode?: string;
  failureMessage?: string;
  /** Super Admin's note when the payout was resolved by hand. */
  resolutionNote?: string;
  /** A late success arrived after its shares were re-sent: possible double payment. */
  needsReview: boolean;
  reviewNote?: string;
  createdAt: string;
  settledAt?: string;
}

export interface Wallet {
  id: string;
  ownerType: RecipientType;
  partnerId?: string;
  label: string;
  mpesaPhone: string;
  updatedAt: string;
}

export interface VendorPlantationRequest {
  id: string;
  plantationRequestId: string;
  vendorId: string;
  assignedAgentId?: string;
  status: VendorRequestStatus;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  vendorId?: string;
  ministryRole?: MinistryRole;
  mustChangePassword?: boolean;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
  vendorId?: string;
  ministryRole?: MinistryRole;
  /** Staff on a temporary password must set their own before anything else. */
  mustChangePassword: boolean;
}

/** Server settings the browser needs to price and label things. */
export interface StoreSettings {
  kesPerUsd: number;
  /** Afrinet collection fee, % of each payment. */
  chargeFeePct: number;
  /** Reserve for M-Pesa B2C transfer fees, % of each payment. */
  payoutFeePct: number;
  simulationAllowed: boolean;
  demoResetAllowed: boolean;
}

export interface TouristProfile {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneNumber: string;
  dateOfBirth: string;
  pledgeAt: string | null;
  createdAt: string;
  totalContributions: number;
}

export interface CertificateRecord {
  id: string;
  certificateType: "Pledge" | "Tree Planting";
  issuedDate: string;
  userName: string;
  userId: string;
  numTrees?: number;
  co2Offset?: number;
  location?: string;
}

/** @deprecated Use AuthSession. Kept so existing imports keep compiling. */
export type MockSession = AuthSession;

export interface StoreState {
  version: number;
  settings: StoreSettings;
  users: AppUser[];
  vendors: Vendor[];
  vendorAgents: VendorAgent[];
  treeTypes: TreeType[];
  trips: Trip[];
  donations: Donation[];
  payments: Payment[];
  plantationRequests: PlantationRequest[];
  paymentAllocations: PaymentAllocation[];
  payouts: Payout[];
  vendorPlantationRequests: VendorPlantationRequest[];
}
