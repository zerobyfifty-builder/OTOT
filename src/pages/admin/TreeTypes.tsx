import { useState } from "react";
import { toast } from "sonner";
import { nid } from "@/lib/ids";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, usd } from "@/lib/format";
import { PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminTreeTypes() {
  const { state, upsertTreeType } = useStore();
  const [name, setName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [offsetKg, setOffsetKg] = useState("160");
  const [costPerTree, setCostPerTree] = useState("8");

  return (
    <PortalPage
      tone="admin"
      title="Tree Types"
      subtitle="Offset capacity and plantation cost drive the calculator mix and donation amount."
    >
      <Card className="bg-white border-admin-primary/10">
        <CardHeader>
          <CardTitle>Add type</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Scientific name</Label>
            <Input value={scientificName} onChange={(e) => setScientificName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>kg CO₂ / tree</Label>
            <Input type="number" value={offsetKg} onChange={(e) => setOffsetKg(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cost / tree (USD)</Label>
            <Input type="number" value={costPerTree} onChange={(e) => setCostPerTree(e.target.value)} />
          </div>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              try {
                await upsertTreeType({
                  id: nid(),
                  name: name.trim(),
                  scientificName: scientificName.trim() || name.trim(),
                  offsetKg: Number(offsetKg) || 160,
                  costPerTree: Number(costPerTree) || 8,
                  active: true,
                });
                setName("");
                setScientificName("");
                toast.success("Tree type added");
              } catch (err) {
                toast.error(apiErrorMessage(err));
              }
            }}
          >
            Add
          </Button>
        </CardContent>
      </Card>
      <Card className="bg-white border-admin-primary/10">
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Offset</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.treeTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.scientificName}</div>
                  </TableCell>
                  <TableCell>{kg(t.offsetKg)}</TableCell>
                  <TableCell>{usd(t.costPerTree)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableFrame>
        </CardContent>
      </Card>
    </PortalPage>
  );
}
