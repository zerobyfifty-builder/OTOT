import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerActionsMenu } from "@/components/admin/PartnerActionsMenu";

interface Partner {
  id: string;
  name: string;
  legal_name: string;
  category: string;
  partner_type_id: string | null;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  verified: boolean;
  has_api_access: boolean;
  created_at: string;
  partner_types?: {
    name: string;
    category: string;
  };
}

interface PartnerType {
  id: string;
  name: string;
  category: string;
}

type CategoryTab = "government" | "business" | "ngo";

const TAB_LABELS: Record<CategoryTab, string> = {
  government: "Government",
  business: "Business",
  ngo: "NGO",
};

const PAGE_SIZE = 10;

export default function AllPartners() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<CategoryTab>("government");
  const [tabCounts, setTabCounts] = useState<Record<CategoryTab, number>>({
    government: 0,
    business: 0,
    ngo: 0,
  });
  const [partnerTypes, setPartnerTypes] = useState<PartnerType[]>([]);

  useEffect(() => {
    fetchPartners();
  }, [currentPage, searchTerm, activeTab, typeFilter]);

  useEffect(() => {
    fetchTabCounts();
  }, []);

  useEffect(() => {
    // reset type filter and fetch types when switching tab
    setTypeFilter("all");
    fetchPartnerTypes(activeTab);
  }, [activeTab]);

  const fetchPartnerTypes = async (cat: CategoryTab) => {
    const { data, error } = await supabase
      .from("partner_types")
      .select("id, name, category")
      .eq("category", cat)
      .order("name");
    if (!error) setPartnerTypes(data || []);
  };

  const fetchTabCounts = async () => {
    const cats: CategoryTab[] = ["government", "business", "ngo"];
    const results = await Promise.all(
      cats.map((c) =>
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("archived", false)
          .eq("category", c)
      )
    );
    const next: Record<CategoryTab, number> = { government: 0, business: 0, ngo: 0 };
    cats.forEach((c, i) => {
      next[c] = results[i].count || 0;
    });
    setTabCounts(next);
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("organizations")
        .select(
          `
          id,
          name,
          legal_name,
          category,
          partner_type_id,
          contact_email,
          contact_phone,
          is_active,
          verified,
          has_api_access,
          created_at,
          partner_types(name, category)
        `,
          { count: "exact" }
        )
        .eq("archived", false)
        .eq("category", activeTab);

      if (typeFilter !== "all") {
        query = query.eq("partner_type_id", typeFilter);
      }

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) throw error;

      setPartners((data as Partner[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPartners();
    fetchTabCounts();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as CategoryTab);
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1">
          {(Object.keys(TAB_LABELS) as CategoryTab[]).map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5"
            >
              {TAB_LABELS[c]}
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {tabCounts[c]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="border shadow-sm">
        {/* Filters */}
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, legal name, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {partnerTypes.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  {pt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary" />
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No {TAB_LABELS[activeTab]} partners found.
              </p>
              <Button
                onClick={() => navigate("/admin/partners/create")}
                className="mt-4"
              >
                Create Your First Partner
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Legal Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Contact</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">API Access</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Joined</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground w-10">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => (
                      <TableRow key={partner.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{partner.name}</TableCell>
                        <TableCell>{partner.legal_name || "-"}</TableCell>
                        <TableCell>{partner.partner_types?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{partner.contact_email || "-"}</div>
                            <div className="text-muted-foreground">
                              {partner.contact_phone || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant={partner.is_active ? "default" : "secondary"}>
                              {partner.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {partner.verified && <Badge variant="outline">Verified</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={partner.has_api_access ? "default" : "secondary"}>
                            {partner.has_api_access ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-xs">
                          {new Date(partner.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <PartnerActionsMenu partner={partner} onUpdate={handleRefresh} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
