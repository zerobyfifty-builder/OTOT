import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAutoPageViewLogger } from "@/hooks/useActivityLogger";

const ActivityLoggerMount = () => {
  useAutoPageViewLogger();
  return null;
};
import { LodgeAuthProvider } from "@/contexts/LodgeAuthContext";
import { AgentAuthProvider } from "@/contexts/AgentAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { LodgeRoute } from "@/components/auth/LodgeRoute";
import { AgentRoute } from "@/components/auth/AgentRoute";
import { BusinessPartnerRoute } from "@/components/auth/BusinessPartnerRoute";
import { InstitutionalRoute } from "@/components/auth/InstitutionalRoute";
import { OwnerRoute } from "@/components/auth/OwnerRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LodgeSidebar } from "@/components/lodge/LodgeSidebar";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import ktbLogo from "@/assets/ktb-logo.png";
import Index from "./pages/Index";
import { Login } from "@/pages/auth/Login";
import { Signup } from "@/pages/auth/Signup";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { ResetPassword } from "@/pages/auth/ResetPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import MagicLink from "@/pages/auth/MagicLink";
import AuthCallback from "@/pages/auth/AuthCallback";
import Pledge from "@/pages/Pledge";
import PledgeB from "@/pages/PledgeB";
import PledgeC from "@/pages/PledgeC";
import CO2Calculator from "@/pages/CO2Calculator";
import { Dashboard } from "@/pages/Dashboard";
import { Profile } from "@/pages/Profile";
import { CarbonCalculator } from "@/pages/CarbonCalculator";
import { TreePurchase } from "@/pages/TreePurchase";
import { MyTrips } from "@/pages/MyTrips";
import { MyTrees } from "@/pages/MyTrees";
import { MyImpact } from "@/pages/MyImpact";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import GodModeOverview from "@/pages/admin/GodModeOverview";
import CreatePartner from "@/pages/admin/CreatePartner";
import Partners from "@/pages/admin/Partners";
import PartnersInstitutional from "@/pages/admin/PartnersInstitutional";
import PartnersBusiness from "@/pages/admin/PartnersBusiness";
import Users from "@/pages/admin/Users";
import AllPartners from "@/pages/admin/AllPartners";
import AccessControlRoles from "@/pages/admin/AccessControlRoles";
import AccessControlModules from "@/pages/admin/AccessControlModules";
import FinancialTransactions from "@/pages/admin/FinancialTransactions";
import AdminContributionTracking from "@/pages/admin/AdminContributionTracking";
import TreesAll from "@/pages/admin/TreesAll";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import TreesManagement from "@/pages/admin/TreesManagement";
import LodgesManagement from "@/pages/admin/LodgesManagement";
import Reimbursements from "@/pages/admin/Reimbursements";
import Reports from "@/pages/admin/Reports";
import { LodgeDashboard } from "@/pages/lodge/LodgeDashboard";
import { LodgeLogin } from "@/pages/lodge/LodgeLogin";
import { LodgeTourists } from "@/pages/lodge/LodgeTourists";
import { LodgeTrees } from "@/pages/lodge/LodgeTrees";
import { LodgeReimbursements } from "@/pages/lodge/LodgeReimbursements";
import { LodgePerformance } from "@/pages/lodge/LodgePerformance";
import { LodgeNotifications } from "@/pages/lodge/LodgeNotifications";
import { LodgeHelp } from "@/pages/lodge/LodgeHelp";
import { PlantTree } from "@/pages/lodge/PlantTree";
import { InstitutionalDashboard } from "@/pages/institutional/InstitutionalDashboard";
import PlantationPartners from "@/pages/institutional/PlantationPartners";
import RecentTrips from "@/pages/institutional/RecentTrips";
import RecentTrees from "@/pages/institutional/RecentTrees";
import AvailableModules from "@/pages/institutional/AvailableModules";
import InstitutionalReports from "@/pages/institutional/Reports";
import InstitutionalTravelAgents from "@/pages/institutional/InstitutionalTravelAgents";

import { InstitutionalSidebar } from "@/components/institutional/InstitutionalSidebar";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import TravelAgentsManagement from "@/pages/admin/TravelAgentsManagement";
import AgentTicketsOverview from "@/pages/admin/AgentTicketsOverview";
import AllOwners from "@/pages/admin/AllOwners";
import CreateOwner from "@/pages/admin/CreateOwner";
import OwnerModules from "@/pages/admin/OwnerModules";
import OwnerLogs from "@/pages/admin/OwnerLogs";
import OwnersLayout from "@/pages/admin/owners/OwnersLayout";
import PerTreeInsights from "@/pages/admin/PerTreeInsights";
import ImpactJourneys from "@/pages/admin/ImpactJourneys";
import ImpactOverview from "@/pages/admin/ImpactOverview";
import { AgentLogin } from "@/pages/agent/AgentLogin";
import { AgentDashboard } from "@/pages/agent/AgentDashboard";
import { AgentCalculateOffset } from "@/pages/agent/AgentCalculateOffset";
import { AgentTickets } from "@/pages/agent/AgentTickets";
import { AgentReimbursements } from "@/pages/agent/AgentReimbursements";
import { AgentHelp } from "@/pages/agent/AgentHelp";
import { OwnerDashboard } from "@/pages/owner/OwnerDashboard";
import { OwnerNurseries } from "@/pages/owner/OwnerNurseries";
import { OwnerPlanting } from "@/pages/owner/OwnerPlanting";
import { OwnerMonitoring } from "@/pages/owner/OwnerMonitoring";
import { OwnerFinancial } from "@/pages/owner/OwnerFinancial";
import { OwnerOutcomes } from "@/pages/owner/OwnerOutcomes";
import { OwnerAdmin } from "@/pages/owner/OwnerAdmin";
import { OrganizationSettings } from "@/pages/owner/OrganizationSettings";
import { OwnerOrders } from "@/pages/owner/OwnerOrders";
import { OwnerImpact } from "@/pages/owner/OwnerImpact";
import { OwnerImpactInsights } from "@/pages/owner/OwnerImpactInsights";
import InstitutionalDisbursements from "@/pages/institutional/InstitutionalDisbursements";
import OwnerTravelAgents from "@/pages/owner/OwnerTravelAgents";
import OwnerTreeManagement from "@/pages/owner/OwnerTreeManagement";
import OwnerTripManagement from "@/pages/owner/OwnerTripManagement";
import OwnerAnalytics from "@/pages/owner/OwnerAnalytics";
import OwnerPayments from "@/pages/owner/OwnerPayments";
import { OwnerForestLocations } from "@/pages/owner/OwnerForestLocations";
import { OwnerMdmSpecies } from "@/pages/owner/OwnerMdmSpecies";
import { OwnerMdmNurseries } from "@/pages/owner/OwnerMdmNurseries";
import { OwnerMdmPlanters } from "@/pages/owner/OwnerMdmPlanters";
import { OwnerMdmSequestration } from "@/pages/owner/OwnerMdmSequestration";
import WalletSettings from "@/pages/admin/WalletSettings";
import { TreeOperations } from "@/pages/owner/TreeOperations";
import PlantingCostsConfig from "@/pages/admin/PlantingCostsConfig";
import ContributionTierSettings from "@/pages/admin/ContributionTierSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  </SidebarProvider>
);

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-admin-cream">
        {children}
      </main>
    </div>
  </SidebarProvider>
);

const LodgeLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <LodgeSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  </SidebarProvider>
);

const AgentLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <AgentSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  </SidebarProvider>
);

const InstitutionalLayout = ({ children, organizationName, organizationCategory }: { 
  children: React.ReactNode;
  organizationName?: string;
  organizationCategory?: string;
}) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <InstitutionalSidebar 
        organizationName={organizationName}
        organizationCategory={organizationCategory}
      />
      <main className="flex-1 overflow-auto bg-background relative">
        <div className="sticky top-0 right-0 z-10 flex justify-end p-4 pointer-events-none">
          <img src={ktbLogo} alt="KTB" className="h-14 object-contain pointer-events-auto" />
        </div>
        {children}
      </main>
    </div>
  </SidebarProvider>
);

const OwnerLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <OwnerSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  </SidebarProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AgentAuthProvider>
      <LodgeAuthProvider>
        <AuthProvider>
          <BrowserRouter>
          <ActivityLoggerMount />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/magic" element={<MagicLink />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/pledge" element={<PledgeC />} />
            <Route path="/pledgea" element={<Pledge />} />
            <Route path="/pledgeb" element={<PledgeB />} />
            <Route path="/pledgec" element={<PledgeC />} />
            <Route path="/co2calculator" element={<CO2Calculator />} />
            
            {/* Protected routes with sidebar */}
            <Route path="/home" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-trips" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyTrips />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-trees" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyTrees />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-impact" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MyImpact />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/carbon-calculator" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CarbonCalculator />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/tree-purchase" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TreePurchase />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/certificates" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold">Certificates</h1>
                    <p className="text-muted-foreground">This feature will be implemented next</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Institutional Partner routes */}
            <Route path="/institutional/travel-agents/tickets" element={<Navigate to="/institutional/travel-agents" replace />} />
            <Route path="/institutional/travel-agents" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <InstitutionalTravelAgents />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/dashboard" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <InstitutionalDashboard />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/partners" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <PlantationPartners />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/trips" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <RecentTrips />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/trees" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <RecentTrees />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/modules" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <AvailableModules />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/reports" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <InstitutionalReports />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            <Route path="/institutional/disbursements" element={
              <InstitutionalRoute>
                <InstitutionalLayout>
                  <InstitutionalDisbursements />
                </InstitutionalLayout>
              </InstitutionalRoute>
            } />
            
            {/* God Mode Admin routes */}
            <Route path="/admin" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <GodModeOverview />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Users routes */}
            <Route path="/admin/users" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <Users />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Partners routes */}
            <Route path="/admin/partners" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <AllPartners />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/partners/institutional" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <PartnersInstitutional />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/partners/business" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <PartnersBusiness />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/partners/create" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <CreatePartner />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Access Control routes */}
            <Route path="/admin/access/roles" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <AccessControlRoles />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/access/modules" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <AccessControlModules />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Contribution Tracking */}
            <Route path="/admin/contributions" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <AdminContributionTracking />
                </AdminLayout>
              </SuperAdminRoute>
            } />

            {/* Financial routes */}
            <Route path="/admin/financial/transactions" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <FinancialTransactions />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Trees routes */}
            <Route path="/admin/trees" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <TreesAll />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/per-tree-insights" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <PerTreeInsights />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/impact-journeys" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <ImpactJourneys />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Travel Agent admin routes */}
            <Route path="/admin/travel-agents" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <TravelAgentsManagement />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/travel-agents/tickets" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <AgentTicketsOverview />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Owner admin routes */}
            <Route element={
              <SuperAdminRoute>
                <AdminLayout>
                  <OwnersLayout />
                </AdminLayout>
              </SuperAdminRoute>
            }>
              <Route path="/admin/owners" element={<AllOwners />} />
              <Route path="/admin/owners/modules" element={<OwnerModules />} />
              <Route path="/admin/owners/logs" element={<OwnerLogs />} />
            </Route>
            <Route path="/admin/owners/create" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <CreateOwner />
                </AdminLayout>
              </SuperAdminRoute>
            } />

            {/* Configuration routes */}
            <Route path="/admin/config/wallet" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <WalletSettings />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/config/planting-costs" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <PlantingCostsConfig />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            <Route path="/admin/config/contribution-tiers" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <ContributionTierSettings />
                </AdminLayout>
              </SuperAdminRoute>
            } />
            
            {/* Owner Portal routes */}
            <Route path="/owner/dashboard" element={
              <OwnerRoute><OwnerLayout><OwnerDashboard /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/orders" element={
              <OwnerRoute><OwnerLayout><OwnerOrders /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/impact" element={
              <OwnerRoute><OwnerLayout><OwnerImpact /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/impact-insights" element={
              <OwnerRoute><OwnerLayout><OwnerImpactInsights /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/nurseries" element={
              <OwnerRoute><OwnerLayout><OwnerNurseries /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/planting" element={
              <OwnerRoute><OwnerLayout><OwnerPlanting /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/monitoring" element={
              <OwnerRoute><OwnerLayout><OwnerMonitoring /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/financial" element={
              <OwnerRoute><OwnerLayout><OwnerFinancial /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/outcomes" element={
              <OwnerRoute><OwnerLayout><OwnerOutcomes /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/admin" element={
              <OwnerRoute><OwnerLayout><OwnerAdmin /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/settings" element={
              <OwnerRoute><OwnerLayout><OrganizationSettings /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/travel-agents" element={
              <OwnerRoute><OwnerLayout><OwnerTravelAgents /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/per-tree-insights" element={
              <OwnerRoute><OwnerLayout><OwnerTreeManagement /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/tree-management" element={
              <Navigate to="/owner/per-tree-insights" replace />
            } />
            <Route path="/owner/pre-tree-management" element={
              <Navigate to="/owner/per-tree-insights" replace />
            } />
            <Route path="/owner/trip-management" element={
              <OwnerRoute><OwnerLayout><OwnerTripManagement /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/analytics" element={
              <OwnerRoute><OwnerLayout><OwnerAnalytics /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/payments" element={
              <OwnerRoute><OwnerLayout><OwnerPayments /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/locations" element={
              <OwnerRoute><OwnerLayout><OwnerForestLocations /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/mdm-species" element={
              <OwnerRoute><OwnerLayout><OwnerMdmSpecies /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/mdm-nurseries" element={
              <OwnerRoute><OwnerLayout><OwnerMdmNurseries /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/mdm-planters" element={
              <OwnerRoute><OwnerLayout><OwnerMdmPlanters /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/mdm-sequestration" element={
              <OwnerRoute><OwnerLayout><OwnerMdmSequestration /></OwnerLayout></OwnerRoute>
            } />
            <Route path="/owner/orders/:contributionId/operations" element={
              <OwnerRoute><OwnerLayout><TreeOperations /></OwnerLayout></OwnerRoute>
            } />

            {/* Legacy Admin routes */}
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <DashboardLayout>
                  <AdminDashboard />
                </DashboardLayout>
              </AdminRoute>
            } />
            <Route path="/admin/trees" element={
              <AdminRoute>
                <DashboardLayout>
                  <TreesManagement />
                </DashboardLayout>
              </AdminRoute>
            } />
            <Route path="/admin/lodges" element={
              <AdminRoute>
                <DashboardLayout>
                  <LodgesManagement />
                </DashboardLayout>
              </AdminRoute>
            } />
            <Route path="/admin/reimbursements" element={
              <AdminRoute>
                <DashboardLayout>
                  <Reimbursements />
                </DashboardLayout>
              </AdminRoute>
            } />
            <Route path="/admin/reports" element={
              <AdminRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </AdminRoute>
            } />
            
            {/* Lodge routes */}
            <Route path="/lodge/login" element={<LodgeLogin />} />
            <Route path="/lodge/dashboard" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgeDashboard />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/tourists" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgeTourists />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/trees" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgeTrees />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/reimbursements" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgeReimbursements />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/performance" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgePerformance />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/notifications" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgeNotifications />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/help" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <LodgeHelp />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/plant-tree/:treeId" element={
              <BusinessPartnerRoute>
                <LodgeLayout>
                  <PlantTree />
                </LodgeLayout>
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/trees" element={
              <BusinessPartnerRoute>
                <LodgeTrees />
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/reimbursements" element={
              <BusinessPartnerRoute>
                <LodgeReimbursements />
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/performance" element={
              <BusinessPartnerRoute>
                <LodgePerformance />
              </BusinessPartnerRoute>
            } />
            <Route path="/lodge/help" element={
              <BusinessPartnerRoute>
                <LodgeHelp />
              </BusinessPartnerRoute>
            } />
            
            {/* Travel Agent routes */}
            <Route path="/agent/login" element={<AgentLogin />} />
            <Route path="/agent/dashboard" element={
              <AgentRoute>
                <AgentLayout>
                  <AgentDashboard />
                </AgentLayout>
              </AgentRoute>
            } />
            <Route path="/agent/calculate" element={
              <AgentRoute>
                <AgentLayout>
                  <AgentCalculateOffset />
                </AgentLayout>
              </AgentRoute>
            } />
            <Route path="/agent/tickets" element={
              <AgentRoute>
                <AgentLayout>
                  <AgentTickets />
                </AgentLayout>
              </AgentRoute>
            } />
            <Route path="/agent/reimbursements" element={
              <AgentRoute>
                <AgentLayout>
                  <AgentReimbursements />
                </AgentLayout>
              </AgentRoute>
            } />
            <Route path="/agent/help" element={
              <AgentRoute>
                <AgentLayout>
                  <AgentHelp />
                </AgentLayout>
              </AgentRoute>
            } />
            
            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </LodgeAuthProvider>
      </AgentAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
