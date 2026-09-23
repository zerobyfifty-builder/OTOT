import { useStore } from "@/contexts/StoreContext";
import { roleLabel } from "@/lib/portal";
import { Users as UsersIcon } from "lucide-react";
import { EmptyState, PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MinistryUsers() {
  const { state } = useStore();
  const users = state.users.filter((u) => u.role === "ministry_admin" || u.role === "ministry_user");
  return (
    <PortalPage
      tone="ministry"
      title="Ministry Users"
      subtitle="Admin can assign and pay; user is view-only in this preview."
    >
      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState icon={UsersIcon} message="No ministry users found." />
          ) : (
          <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ministry_admin" ? "default" : "secondary"} className="capitalize">
                      {u.ministryRole || roleLabel(u.role)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableFrame>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
