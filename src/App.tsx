import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { PortalGate } from "@/components/auth/PortalGate";
import { RoleRoute } from "@/components/auth/RoleRoute";
import { TouristLayout } from "@/components/layout/TouristLayout";
import { MinistryLayout } from "@/components/layout/MinistryLayout";
import { PartnerLayout } from "@/components/layout/PartnerLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import TouristDashboard from "@/pages/tourist/Dashboard";
import CarbonCalculator from "@/pages/tourist/CarbonCalculator";
import MyTrips from "@/pages/tourist/MyTrips";
import MyTrees from "@/pages/tourist/MyTrees";
import MyImpact from "@/pages/tourist/MyImpact";
import Donate from "@/pages/tourist/Donate";
import Payment from "@/pages/tourist/Payment";
import AwaitingPayment from "@/pages/tourist/AwaitingPayment";
import DonationDetail from "@/pages/tourist/DonationDetail";
import Profile from "@/pages/tourist/Profile";
import MinistryDashboard from "@/pages/ministry/Dashboard";
import MinistryDonations from "@/pages/ministry/Donations";
import MinistryRequests from "@/pages/ministry/Requests";
import MinistryPartners from "@/pages/ministry/Partners";
import MinistryPayouts from "@/pages/ministry/Payouts";
import MinistryUsers from "@/pages/ministry/Users";
import PartnerDashboard from "@/pages/partner/Dashboard";
import PartnerRequests from "@/pages/partner/Requests";
import PartnerAssignments from "@/pages/partner/Assignments";
import PartnerTeam from "@/pages/partner/Team";
import PartnerPayouts from "@/pages/partner/Payouts";
import AdminOverview from "@/pages/admin/Overview";
import AdminUsers from "@/pages/admin/Users";
import AdminVendors from "@/pages/admin/Vendors";
import AdminTreeTypes from "@/pages/admin/TreeTypes";
import AdminFinance from "@/pages/admin/Finance";
import AdminConfig from "@/pages/admin/Config";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function wrap(roles: Parameters<typeof RoleRoute>[0]["roles"], Layout: (p: { children: ReactNode }) => JSX.Element, page: ReactNode) {
  return (
    <RoleRoute roles={roles}>
      <Layout>{page}</Layout>
    </RoleRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <StoreProvider>
          <BrowserRouter>
            <PortalGate>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />

                <Route path="/dashboard" element={wrap(["tourist"], TouristLayout, <TouristDashboard />)} />
                <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                <Route path="/my-trips" element={wrap(["tourist"], TouristLayout, <MyTrips />)} />
                <Route path="/my-trees" element={wrap(["tourist"], TouristLayout, <MyTrees />)} />
                <Route path="/my-impact" element={wrap(["tourist"], TouristLayout, <MyImpact />)} />
                <Route path="/carbon-calculator" element={wrap(["tourist"], TouristLayout, <CarbonCalculator />)} />
                <Route path="/donate" element={wrap(["tourist"], TouristLayout, <Donate />)} />
                <Route path="/donate/pay" element={wrap(["tourist"], TouristLayout, <Payment />)} />
                <Route path="/donate/awaiting/:paymentId" element={wrap(["tourist"], TouristLayout, <AwaitingPayment />)} />
                <Route path="/donations/:id" element={wrap(["tourist"], TouristLayout, <DonationDetail />)} />
                <Route path="/profile" element={wrap(["tourist"], TouristLayout, <Profile />)} />

                <Route path="/ministry/dashboard" element={wrap(["ministry_admin", "ministry_user"], MinistryLayout, <MinistryDashboard />)} />
                <Route path="/ministry/donations" element={wrap(["ministry_admin", "ministry_user"], MinistryLayout, <MinistryDonations />)} />
                <Route path="/ministry/requests" element={wrap(["ministry_admin", "ministry_user"], MinistryLayout, <MinistryRequests />)} />
                <Route path="/ministry/partners" element={wrap(["ministry_admin", "ministry_user"], MinistryLayout, <MinistryPartners />)} />
                <Route path="/ministry/payouts" element={wrap(["ministry_admin", "ministry_user"], MinistryLayout, <MinistryPayouts />)} />
                <Route path="/ministry/users" element={wrap(["ministry_admin"], MinistryLayout, <MinistryUsers />)} />
                <Route path="/institutional/dashboard" element={<Navigate to="/ministry/dashboard" replace />} />

                <Route path="/partner/dashboard" element={wrap(["partner_admin"], PartnerLayout, <PartnerDashboard />)} />
                <Route path="/partner/requests" element={wrap(["partner_admin"], PartnerLayout, <PartnerRequests />)} />
                <Route path="/partner/team" element={wrap(["partner_admin"], PartnerLayout, <PartnerTeam />)} />
                <Route path="/partner/payouts" element={wrap(["partner_admin"], PartnerLayout, <PartnerPayouts />)} />
                <Route path="/partner/assignments" element={wrap(["partner_admin", "partner_agent"], PartnerLayout, <PartnerAssignments />)} />

                <Route path="/admin" element={wrap(["super_admin"], AdminLayout, <AdminOverview />)} />
                <Route path="/admin/users" element={wrap(["super_admin"], AdminLayout, <AdminUsers />)} />
                <Route path="/admin/vendors" element={wrap(["super_admin"], AdminLayout, <AdminVendors />)} />
                <Route path="/admin/tree-types" element={wrap(["super_admin"], AdminLayout, <AdminTreeTypes />)} />
                <Route path="/admin/finance" element={wrap(["super_admin"], AdminLayout, <AdminFinance />)} />
                <Route path="/admin/config" element={wrap(["super_admin"], AdminLayout, <AdminConfig />)} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </PortalGate>
          </BrowserRouter>
        </StoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
