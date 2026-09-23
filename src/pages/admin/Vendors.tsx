import { useState } from "react";
import { toast } from "sonner";
import { nid } from "@/lib/ids";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { PortalPage, TableFrame } from "@/components/portal/PortalUI";
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
import type { Vendor } from "@/types/otot";

function VendorMpesaEditor({ vendor }: { vendor: Vendor }) {
  const { upsertVendor } = useStore();
  const [phone, setPhone] = useState(vendor.mpesaPhone ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-8 font-mono text-xs w-40"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="2547XXXXXXXX"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={saving || phone.trim() === (vendor.mpesaPhone ?? "")}
        onClick={async () => {
          setSaving(true);
          try {
            await upsertVendor({ ...vendor, mpesaPhone: phone.trim() || undefined });
            toast.success("M-Pesa number saved");
          } catch (err) {
            toast.error(apiErrorMessage(err));
          } finally {
            setSaving(false);
          }
        }}
      >
        Save
      </Button>
    </div>
  );
}

export default function AdminVendors() {
  const { state, upsertVendor } = useStore();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");

  return (
    <PortalPage tone="admin" title="Vendors" subtitle="Plantation partner organisations.">
      <Card className="bg-white border-admin-primary/10">
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
          <div className="space-y-2 flex-1 w-full">
            <Label>M-Pesa number</Label>
            <Input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="2547XXXXXXXX" />
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
                  mpesaPhone: mpesaPhone.trim() || undefined,
                });
                setName("");
                setRegion("");
                setMpesaPhone("");
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
      <Card className="bg-white border-admin-primary/10">
        <CardHeader>
          <CardTitle>All vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <TableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>M-Pesa</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.region}</TableCell>
                  <TableCell>
                    <VendorMpesaEditor vendor={v} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
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
