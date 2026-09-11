import { Link } from "react-router-dom";
import { Calculator, HeartHandshake, Trees } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { kg, shortDate, treeCount, usd } from "@/lib/format";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TouristDashboard() {
  const { session } = useAuth();
  const { state } = useStore();
  const mine = state.donations.filter((d) => d.userId === session?.userId);
  const paid = mine.filter((d) => d.status === "paid");
  const trees = paid.reduce((s, d) => s + treeCount(d.trees), 0);
  const offset = paid.reduce((s, d) => s + d.carbonOffsetKg, 0);
  const spent = paid.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {session?.name}</h1>
          <p className="text-muted-foreground mt-1">
            Offset travel emissions and fund trees planted by ministry partners.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/carbon-calculator">Calculate impact</Link>
          </Button>
          <Button asChild>
            <Link to="/donate">Donate</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Trees funded" value={trees} icon={Trees} hint="From paid donations" />
        <KpiCard title="CO₂ targeted" value={kg(offset)} icon={Calculator} />
        <KpiCard title="Donated" value={usd(spent)} icon={HeartHandshake} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your donations</CardTitle>
        </CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">No donations yet. Start with the carbon calculator.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Trees</TableHead>
                  <TableHead>Offset</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mine.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{shortDate(d.createdAt)}</TableCell>
                    <TableCell>{treeCount(d.trees)}</TableCell>
                    <TableCell>{kg(d.carbonOffsetKg)}</TableCell>
                    <TableCell>{usd(d.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/donations/${d.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
