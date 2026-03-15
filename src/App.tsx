import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LodgeAuthProvider } from "@/contexts/LodgeAuthContext";
import { AgentAuthProvider } from "@/contexts/AgentAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { LodgeRoute } from "@/components/auth/LodgeRoute";
import { AgentRoute } from "@/components/auth/AgentRoute";
import { BusinessPartnerRoute } from "@/components/auth/BusinessPartnerRoute";
import { InstitutionalRoute } from "@/components/auth/InstitutionalRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LodgeSidebar } from "@/components/lodge/LodgeSidebar";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
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
import InstitutionalAgentTickets from "@/pages/institutional/InstitutionalAgentTickets";
import { InstitutionalSidebar } from "@/components/institutional/InstitutionalSidebar";
import TravelAgentsManagement from "@/pages/admin/TravelAgentsManagement";
import AgentTicketsOverview from "@/pages/admin/AgentTicketsOverview";
import { AgentLogin } from "@/pages/agent/AgentLogin";
import { AgentDashboard } from "@/pages/agent/AgentDashboard";
import { AgentCalculateOffset } from "@/pages/agent/AgentCalculateOffset";
import { AgentTickets } from "@/pages/agent/AgentTickets";
import { AgentReimbursements } from "@/pages/agent/AgentReimbursements";
import { AgentHelp } from "@/pages/agent/AgentHelp";
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

const InstitutionalLayout = ({ children, organizationName, organizationCategory, showKtbLogo = true }: { 
  children: React.ReactNode;
  organizationName?: string;
  organizationCategory?: string;
  showKtbLogo?: boolean;
}) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <InstitutionalSidebar 
        organizationName={organizationName}
        organizationCategory={organizationCategory}
      />
      <main className="flex-1 overflow-auto bg-background relative">
        {showKtbLogo && (
          <div className="absolute top-4 right-6 z-10">
            <img src={ktbLogo} alt="KTB" className="h-10 object-contain" />
          </div>
        )}
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
