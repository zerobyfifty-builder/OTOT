import { useMemo, useState } from "react";
import { Download, Leaf, MoreHorizontal, Pencil, Plus, Power, Search, TreePine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { nid } from "@/lib/ids";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { kg, usd } from "@/lib/format";
import { downloadCsv } from "@/components/admin/styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TreeType } from "@/types/otot";

interface TreeForm {
  name: string;
  scientificName: string;
  offsetKg: string;
  costPerTree: string;
}

const EMPTY_FORM: TreeForm = { name: "", scientificName: "", offsetKg: "160", costPerTree: "8" };

const toForm = (tree: TreeType): TreeForm => ({
  name: tree.name,
  scientificName: tree.scientificName,
  offsetKg: String(tree.offsetKg),
  costPerTree: String(tree.costPerTree),
});

function SummaryTile({ label, value, icon: Icon, tint }: { label: string; value: string | number; icon: LucideIcon; tint: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tint}`}>
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTreeTypes() {
  const { state, loading, upsertTreeType } = useStore();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TreeType | null>(null);
  const [form, setForm] = useState<TreeForm>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<TreeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const trees = state.treeTypes;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trees.filter(
      (t) =>
        (!q || t.name.toLowerCase().includes(q) || t.scientificName.toLowerCase().includes(q)) &&
        (filterActive === "all" || (filterActive === "active" ? t.active : !t.active)),
    );
  }, [trees, search, filterActive]);

  const count = Math.max(1, trees.length);
  const avgOffset = trees.reduce((s, t) => s + t.offsetKg, 0) / count;
  const avgCost = trees.reduce((s, t) => s + t.costPerTree, 0) / count;
  const isDirty = !editing || JSON.stringify(form) !== JSON.stringify(initialForm);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setInitialForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (tree: TreeType) => {
    const data = toForm(tree);
    setForm(data);
    setInitialForm(data);
    setEditing(tree);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await upsertTreeType({
        id: editing?.id ?? nid(),
        name: form.name.trim(),
        scientificName: form.scientificName.trim() || form.name.trim(),
        offsetKg: Number(form.offsetKg) || 160,
        costPerTree: Number(form.costPerTree) || 8,
        active: editing?.active ?? true,
      });
      toast.success(editing ? "Tree type updated" : "Tree type added");
      resetForm();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tree: TreeType) => {
    try {
      await upsertTreeType({ ...tree, active: !tree.active });
      toast.success(tree.active ? "Tree type deactivated" : "Tree type activated");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleExportCSV = () => {
    downloadCsv("tree_types.csv", [
      ["Name", "Scientific Name", "kg CO2 / tree", "Cost / tree (USD)", "Active"],
      ...filtered.map((t) => [t.name, t.scientificName, t.offsetKg, t.costPerTree, t.active ? "Yes" : "No"]),
    ]);
    toast.success("CSV exported");
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tree Types</h1>
          <p className="text-muted-foreground mt-1">
            Offset capacity and plantation cost drive the calculator mix and donation amount.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add Tree Type
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryTile label="Tree types" value={trees.length} icon={TreePine} tint="bg-emerald-100" />
        <SummaryTile label="Active" value={trees.filter((t) => t.active).length} icon={TreePine} tint="bg-blue-100" />
        <SummaryTile label="Inactive" value={trees.filter((t) => !t.active).length} icon={TreePine} tint="bg-muted" />
        <SummaryTile label="Avg kg CO₂ / tree" value={kg(avgOffset)} icon={Leaf} tint="bg-violet-100" />
        <SummaryTile label="Avg cost / tree" value={usd(avgCost)} icon={Leaf} tint="bg-amber-100" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} tree types</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Scientific Name</TableHead>
                  <TableHead>Offset / tree</TableHead>
                  <TableHead>Cost / tree</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tree types found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow key={t.id} className={t.active ? "" : "opacity-50"}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground italic text-sm">{t.scientificName || "—"}</TableCell>
                      <TableCell className="tabular-nums">{kg(t.offsetKg)} CO₂</TableCell>
                      <TableCell className="tabular-nums">{usd(t.costPerTree)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={t.active ? "default" : "secondary"} className="text-[10px]">
                          {t.active ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${t.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(t)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(t)}>
                              <Power className="h-3.5 w-3.5 mr-2" /> {t.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={showForm}
        onOpenChange={(open) => {
          if (!open) resetForm();
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Tree Type" : "Add New Tree Type"}</SheetTitle>
            <SheetDescription>Fill in the tree type details below</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. African Cherry"
                />
              </div>
              <div>
                <Label>Scientific Name</Label>
                <Input
                  value={form.scientificName}
                  onChange={(e) => setForm((p) => ({ ...p, scientificName: e.target.value }))}
                  placeholder="e.g. Prunus africana"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>kg CO₂ / tree</Label>
                  <Input
                    type="number"
                    value={form.offsetKg}
                    onChange={(e) => setForm((p) => ({ ...p, offsetKg: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Cost / tree (USD)</Label>
                  <Input
                    type="number"
                    value={form.costPerTree}
                    onChange={(e) => setForm((p) => ({ ...p, costPerTree: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1" disabled={!isDirty || saving}>
                {saving ? "Saving..." : `${editing ? "Update" : "Add"} Tree Type`}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
