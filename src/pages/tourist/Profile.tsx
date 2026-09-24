import { ArrowLeft, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { roleLabel } from "@/lib/portal";
import { TouristPage } from "@/components/layout/TouristPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { session } = useAuth();
  const { state } = useStore();
  if (!session) return null;

  const user = state.users.find((entry) => entry.id === session.userId);
  const paidDonations = state.donations.filter(
    (donation) => donation.userId === session.userId && donation.status === "paid",
  );
  const totalContributions = paidDonations.reduce((total, donation) => total + donation.amount, 0);
  const hasPledged = localStorage.getItem("otot.travelerPledge") === "1";
  const initials = session.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <TouristPage className="max-w-6xl">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Personal Information
            </CardTitle>
            <CardDescription>Your traveler account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {initials || "T"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{session.name}</p>
                <p className="text-sm text-muted-foreground">{roleLabel(session.role)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Full Name</p>
                <p className="font-medium">{session.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium break-all">{session.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card h-fit">
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>Your account details and carbon offset status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium break-all">{session.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Created</p>
                <p className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Pledge Status</p>
              <Badge variant={hasPledged ? "default" : "secondary"}>{hasPledged ? "Active" : "Not Active"}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Total Contributions</p>
              <p className="font-medium">${totalContributions.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TouristPage>
  );
}
