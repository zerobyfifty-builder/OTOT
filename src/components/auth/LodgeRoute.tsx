import { Navigate } from "react-router-dom";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";

interface LodgeRouteProps {
  children: React.ReactNode;
}

export const LodgeRoute: React.FC<LodgeRouteProps> = ({ children }) => {
  const { lodge, loading } = useLodgeAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lodge) {
    return <Navigate to="/lodge/login" replace />;
  }

  return <>{children}</>;
};
