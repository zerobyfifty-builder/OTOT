import { useState } from "react";
import { toast } from "sonner";
import { nid } from "@/lib/ids";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { StatusBadge } from "@/components/shared/StatusBadge";
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

export default function AdminVendors() {
  const { state, upsertVendor } = useStore();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
        <p className="text-muted-foreground mt-1">Plantation partner organisations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add vendor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-2 flex-1 w-full">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1 w-full">
            <Label>Region</Label>
            <Input value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              try {
                await upsertVendor({
                  id: nid(),
                  name: name.trim(),
                  region: region.trim() || "Kenya",
                  status: "active",
                });
                setName("");
                setRegion("");
                toast.success("Vendor added");
              } catch (err) {
                toast.error(apiErrorMessage(err));
              }
            }}
          >
            Add
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>All vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.region}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
