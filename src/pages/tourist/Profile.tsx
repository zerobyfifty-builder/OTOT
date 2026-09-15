import { useAuth } from "@/contexts/AuthContext";
import { roleLabel } from "@/lib/portal";
import { TouristPage } from "@/components/layout/TouristPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <TouristPage title="Profile" subtitle="Your traveler account" className="max-w-xl">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Name</span> · {session.name}</div>
          <div><span className="text-muted-foreground">Email</span> · {session.email}</div>
          <div><span className="text-muted-foreground">Role</span> · {roleLabel(session.role)}</div>
          <p className="text-muted-foreground pt-4">
            Signed in with a JWT issued by the OTOT API.
          </p>
        </CardContent>
      </Card>
    </TouristPage>
  );
}
