import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LodgeAuthProvider } from "@/contexts/LodgeAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { LodgeRoute } from "@/components/auth/LodgeRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import { Login } from "@/pages/auth/Login";
import { Signup } from "@/pages/auth/Signup";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import MagicLink from "@/pages/auth/MagicLink";
import AuthCallback from "@/pages/auth/AuthCallback";
import Pledge from "@/pages/Pledge";
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
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import TreesManagement from "@/pages/admin/TreesManagement";
import LodgesManagement from "@/pages/admin/LodgesManagement";
import Reimbursements from "@/pages/admin/Reimbursements";
import Reports from "@/pages/admin/Reports";
import { LodgeLogin } from "@/pages/lodge/LodgeLogin";
import { LodgeDashboard } from "@/pages/lodge/LodgeDashboard";
import { PlantTree } from "@/pages/lodge/PlantTree";
import { LodgeTrees } from "@/pages/lodge/LodgeTrees";
import { LodgeReimbursements } from "@/pages/lodge/LodgeReimbursements";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
            <Route path="/pledge" element={<Pledge />} />
            <Route path="/co2calculator" element={<CO2Calculator />} />
            
            {/* Protected routes with sidebar */}
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
            
            {/* God Mode Admin routes */}
            <Route path="/admin" element={
              <SuperAdminRoute>
                <AdminLayout>
                  <GodModeOverview />
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
              <LodgeRoute>
                <LodgeDashboard />
              </LodgeRoute>
            } />
            <Route path="/lodge/plant-tree/:treeId" element={
              <LodgeRoute>
                <PlantTree />
              </LodgeRoute>
            } />
            <Route path="/lodge/trees" element={
              <LodgeRoute>
                <LodgeTrees />
              </LodgeRoute>
            } />
            <Route path="/lodge/reimbursements" element={
              <LodgeRoute>
                <LodgeReimbursements />
              </LodgeRoute>
            } />
            
            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </LodgeAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
