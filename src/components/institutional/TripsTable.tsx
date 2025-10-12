import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronDown, Search } from "lucide-react";
import { format } from "date-fns";
import { formatNumber } from "@/lib/utils";

interface Trip {
  id: string;
  user_email: string;
  origin_airport: string;
  destination_airport: string;
  from_date: string;
  to_date: string | null;
  flight_co2: number;
  accommodation_co2: number;
  total_co2: number;
  trees_needed: number;
  travel_class: string;
  created_at: string;
}

interface TripsTableProps {
  trips: Trip[];
  isLoading: boolean;
}

export const TripsTable = ({ trips, isLoading }: TripsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Trip>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Filter trips based on search query
  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    
    return trips.filter((trip) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        trip.user_email?.toLowerCase().includes(searchLower) ||
        trip.origin_airport?.toLowerCase().includes(searchLower) ||
        trip.destination_airport?.toLowerCase().includes(searchLower)
      );
    });
  }, [trips, searchQuery]);

  // Sort filtered trips
  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === "asc"
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });
    
    return sorted;
  }, [filteredTrips, sortField, sortDirection]);

  // Paginate sorted trips
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTrips.slice(startIndex, startIndex + pageSize);
  }, [sortedTrips, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTrips.length / pageSize);

  const handleSort = (field: keyof Trip) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, airport..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        
        <Select value={pageSize.toString()} onValueChange={(value) => {
          setPageSize(Number(value));
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("user_email")}
              >
                <div className="flex items-center gap-2">
                  Tourist
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("origin_airport")}
              >
                <div className="flex items-center gap-2">
                  Route
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("from_date")}
              >
                <div className="flex items-center gap-2">
                  Travel Dates
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("travel_class")}
              >
                <div className="flex items-center gap-2">
                  Class
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("flight_co2")}
              >
                <div className="flex items-center justify-end gap-2">
                  Flight CO₂
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("accommodation_co2")}
              >
                <div className="flex items-center justify-end gap-2">
                  Accom. CO₂
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("total_co2")}
              >
                <div className="flex items-center justify-end gap-2">
                  Total CO₂
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-primary/10 transition-colors group"
                onClick={() => handleSort("trees_needed")}
              >
                <div className="flex items-center justify-end gap-2">
                  Trees
                  <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrips.length > 0 ? (
              paginatedTrips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">{trip.user_email}</TableCell>
                  <TableCell>
                    {trip.origin_airport} → {trip.destination_airport}
                  </TableCell>
                  <TableCell>
                    {format(new Date(trip.from_date), "MMM d, yyyy")}
                    {trip.to_date && ` - ${format(new Date(trip.to_date), "MMM d, yyyy")}`}
                  </TableCell>
                  <TableCell className="capitalize">{trip.travel_class}</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(trip.flight_co2))} kg</TableCell>
                  <TableCell className="text-right">{formatNumber(Number(trip.accommodation_co2))} kg</TableCell>
                  <TableCell className="text-right font-semibold">{formatNumber(Number(trip.total_co2))} kg</TableCell>
                  <TableCell className="text-right">{trip.trees_needed}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No trips found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, sortedTrips.length)} to{" "}
            {Math.min(currentPage * pageSize, sortedTrips.length)} of {sortedTrips.length} trips
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
