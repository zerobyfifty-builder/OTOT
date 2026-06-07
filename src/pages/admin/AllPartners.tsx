import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Search, RefreshCw, Building2 } from "lucide-react";
import { toast } from "sonner";
import { PartnerActionsMenu } from "@/components/admin/PartnerActionsMenu";

interface Partner {
  id: string;
  name: string;
  legal_name: string;
  category: string;
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

type CategoryTab = "government" | "business" | "ngo";

const TAB_LABELS: Record<CategoryTab, string> = {
  government: "Government",
  business: "Business",
  ngo: "NGO",
};

export default function AllPartners() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>("government");
  const [tabCounts, setTabCounts] = useState<Record<CategoryTab, number>>({
    government: 0,
    business: 0,
    ngo: 0,
  });

  useEffect(() => {
    fetchPartners();
  }, [currentPage, pageSize, searchTerm, activeTab]);

  useEffect(() => {
    fetchTabCounts();
  }, []);

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

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;

      setPartners(data || []);
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

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleRefresh} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => navigate("/admin/partners/create")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Partner
        </Button>
      </div>

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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
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
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Legal Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>API Access</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell className="font-medium">
                          {partner.name}
                        </TableCell>
                        <TableCell>{partner.legal_name || "-"}</TableCell>
                        <TableCell>
                          {partner.partner_types?.name || "-"}
                        </TableCell>
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
                            <Badge
                              variant={
                                partner.is_active ? "default" : "secondary"
                              }
                            >
                              {partner.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {partner.verified && (
                              <Badge variant="outline">Verified</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              partner.has_api_access ? "default" : "secondary"
                            }
                          >
                            {partner.has_api_access ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(partner.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <PartnerActionsMenu
                            partner={partner}
                            onUpdate={handleRefresh}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  partners
                </p>
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
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
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
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
        </CardContent>
      </Card>
    </div>
  );
}
