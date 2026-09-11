import { useAuth } from "@/contexts/AuthContext";
import { roleLabel } from "@/lib/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <div className="p-6 md:p-8 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Name</span> · {session.name}</div>
          <div><span className="text-muted-foreground">Email</span> · {session.email}</div>
          <div><span className="text-muted-foreground">Role</span> · {roleLabel(session.role)}</div>
          <p className="text-muted-foreground pt-4">
            Profile is a local demo session. JWT / OAuth can replace this later without changing the screens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
