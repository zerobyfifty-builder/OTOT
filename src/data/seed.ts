import { nid } from "@/lib/ids";
import { splitCharges } from "@/lib/charges";
import type { StoreState } from "@/types/otot";

export const DEMO_PASSWORD = "Test1234!";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

export function createSeed(): StoreState {
  const touristId = "user-tourist";
  const ministryAdminId = "user-ministry-admin";
  const ministryUserId = "user-ministry-user";
  const partnerAdminId = "user-partner-admin";
  const partnerAgentId = "user-partner-agent";
  const superAdminId = "user-superadmin";

  const vendor1 = "vendor-mau";
  const vendor2 = "vendor-greenbelt";

  const acacia = {
    id: "tree-acacia",
    name: "Acacia",
    scientificName: "Acacia xanthophloea",
    offsetKg: 160,
    costPerTree: 8,
    active: true,
  };
  const croton = {
    id: "tree-croton",
    name: "Croton",
    scientificName: "Croton megalocarpus",
    offsetKg: 140,
    costPerTree: 7,
    active: true,
  };
  const cedar = {
    id: "tree-cedar",
    name: "African Cedar",
    scientificName: "Juniperus procera",
    offsetKg: 200,
    costPerTree: 12,
    active: true,
  };

  const donationPaid: StoreState["donations"][number] = {
    id: "don-paid",
    userId: touristId,
    tripId: "trip-lhr-nbo",
    carbonOffsetKg: 480,
    amount: 31,
    trees: [
      { treeTypeId: acacia.id, treeType: acacia.name, count: 2 },
      { treeTypeId: croton.id, treeType: croton.name, count: 1 },
    ],
    status: "paid",
    createdAt: daysAgo(2),
  };

  const donationAssigned: StoreState["donations"][number] = {
    id: "don-assigned",
    userId: touristId,
    tripId: "trip-dxb-nbo",
    carbonOffsetKg: 640,
    amount: 39,
    trees: [
      { treeTypeId: acacia.id, treeType: acacia.name, count: 2 },
      { treeTypeId: cedar.id, treeType: cedar.name, count: 2 },
    ],
    status: "paid",
    createdAt: daysAgo(8),
  };

  const donationComplete: StoreState["donations"][number] = {
    id: "don-complete",
    userId: touristId,
    tripId: "trip-nbo-mba",
    carbonOffsetKg: 320,
    amount: 16,
    trees: [{ treeTypeId: acacia.id, treeType: acacia.name, count: 2 }],
    status: "paid",
    createdAt: daysAgo(21),
  };

  const reqAssigned = {
    id: "pr-assigned",
    donationId: donationAssigned.id,
    status: "in_progress" as const,
    assignedTo: partnerAdminId,
    partnerId: vendor1,
    amount: donationAssigned.amount,
    createdAt: daysAgo(7),
  };

  const reqComplete = {
    id: "pr-complete",
    donationId: donationComplete.id,
    status: "completed" as const,
    assignedTo: partnerAdminId,
    partnerId: vendor1,
    amount: donationComplete.amount,
    createdAt: daysAgo(20),
  };

  const vprActive = {
    id: "vpr-active",
    plantationRequestId: reqAssigned.id,
    vendorId: vendor1,
    assignedAgentId: partnerAgentId,
    status: "in_progress" as const,
    createdAt: daysAgo(6),
  };

  const vprDone = {
    id: "vpr-done",
    plantationRequestId: reqComplete.id,
    vendorId: vendor1,
    assignedAgentId: partnerAgentId,
    status: "completed" as const,
    createdAt: daysAgo(18),
  };

  return {
    version: 1,
    users: [
      {
        id: touristId,
        email: "tourist@demo.otot.app",
        name: "Amina Tourist",
        role: "tourist",
        createdAt: daysAgo(40),
      },
      {
        id: ministryAdminId,
        email: "ministry@demo.otot.app",
        name: "Kwame Otieno",
        role: "ministry_admin",
        ministryRole: "admin",
        createdAt: daysAgo(60),
      },
      {
        id: ministryUserId,
        email: "ministryuser@demo.otot.app",
        name: "Faith Wanjiku",
        role: "ministry_user",
        ministryRole: "user",
        createdAt: daysAgo(30),
      },
      {
        id: partnerAdminId,
        email: "partner@demo.otot.app",
        name: "Daniel Kiptoo",
        role: "partner_admin",
        vendorId: vendor1,
        createdAt: daysAgo(50),
      },
      {
        id: partnerAgentId,
        email: "partneragent@demo.otot.app",
        name: "Grace Chebet",
        role: "partner_agent",
        vendorId: vendor1,
        createdAt: daysAgo(45),
      },
      {
        id: superAdminId,
        email: "superadmin@demo.otot.app",
        name: "OTOT Super Admin",
        role: "super_admin",
        createdAt: daysAgo(90),
      },
    ],
    vendors: [
      { id: vendor1, name: "Mau Forest Restoration Group", region: "Nakuru", status: "active" },
      { id: vendor2, name: "Green Belt Planting Co", region: "Kiambu", status: "active" },
    ],
    vendorAgents: [
      { id: nid(), userId: partnerAdminId, vendorId: vendor1, role: "admin" },
      { id: nid(), userId: partnerAgentId, vendorId: vendor1, role: "agent" },
    ],
    treeTypes: [acacia, croton, cedar],
    trips: [
      {
        id: "trip-lhr-nbo",
        userId: touristId,
        originAirport: "LHR",
        destinationAirport: "NBO",
        travelClass: "economy",
        isReturn: true,
        fromDate: daysAgo(14).slice(0, 10),
        toDate: daysAgo(7).slice(0, 10),
        accommodationType: "hotel",
        numTravelers: 1,
        flightCo2: 890,
        accommodationCo2: 210,
        totalCo2: 1100,
        treesNeeded: 8,
        distanceKm: 6800,
        entrySource: "Manual",
        friendlyTripId: "OT-1001",
        createdAt: daysAgo(13),
      },
      {
        id: "trip-dxb-nbo",
        userId: touristId,
        originAirport: "DXB",
        destinationAirport: "NBO",
        travelClass: "business",
        isReturn: true,
        fromDate: daysAgo(22).slice(0, 10),
        toDate: daysAgo(14).slice(0, 10),
        accommodationType: "hotel",
        numTravelers: 1,
        flightCo2: 720,
        accommodationCo2: 180,
        totalCo2: 900,
        treesNeeded: 4,
        distanceKm: 3520,
        entrySource: "Manual",
        friendlyTripId: "OT-1002",
        createdAt: daysAgo(21),
      },
      {
        id: "trip-nbo-mba",
        userId: touristId,
        originAirport: "NBO",
        destinationAirport: "MBA",
        travelClass: "economy",
        isReturn: false,
        fromDate: daysAgo(30).slice(0, 10),
        toDate: daysAgo(28).slice(0, 10),
        accommodationType: "none",
        numTravelers: 1,
        flightCo2: 180,
        accommodationCo2: 0,
        totalCo2: 180,
        treesNeeded: 2,
        distanceKm: 440,
        entrySource: "Manual",
        friendlyTripId: "OT-1003",
        createdAt: daysAgo(29),
      },
      {
        id: "trip-jfk-nbo",
        userId: touristId,
        originAirport: "JFK",
        destinationAirport: "NBO",
        travelClass: "economy",
        isReturn: true,
        fromDate: daysAgo(6).slice(0, 10),
        toDate: daysAgo(1).slice(0, 10),
        accommodationType: "rental",
        numTravelers: 2,
        flightCo2: 1420,
        accommodationCo2: 280,
        totalCo2: 1700,
        treesNeeded: 12,
        distanceKm: 11800,
        entrySource: "Manual",
        friendlyTripId: "OT-1004",
        createdAt: daysAgo(5),
      },
    ],
    donations: [donationPaid, donationAssigned, donationComplete],
    payments: [
      {
        id: "pay-1",
        donationId: donationPaid.id,
        paymentMode: "Card",
        status: "success",
        amount: donationPaid.amount,
        transactionChargesSplit: splitCharges(donationPaid.amount),
        createdAt: donationPaid.createdAt,
      },
      {
        id: "pay-2",
        donationId: donationAssigned.id,
        paymentMode: "M-Pesa",
        status: "success",
        amount: donationAssigned.amount,
        transactionChargesSplit: splitCharges(donationAssigned.amount),
        createdAt: donationAssigned.createdAt,
      },
      {
        id: "pay-3",
        donationId: donationComplete.id,
        paymentMode: "Card",
        status: "success",
        amount: donationComplete.amount,
        transactionChargesSplit: splitCharges(donationComplete.amount),
        createdAt: donationComplete.createdAt,
      },
    ],
    plantationRequests: [reqAssigned, reqComplete],
    plantationPayouts: [
      {
        id: "payout-1",
        plantationRequestId: reqComplete.id,
        amount: splitCharges(donationComplete.amount).plantation,
        payoutStatus: "paid",
        transactionId: "TXN-88421",
        transactionReferenceNumber: "KTB-PAY-1029",
        createdAt: daysAgo(4),
      },
    ],
    vendorPlantationRequests: [vprActive, vprDone],
  };
}
