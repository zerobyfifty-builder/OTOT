import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export function TablePagination({
  currentPage,
  pageSize,
  totalCount,
  noun,
  compact,
  onPageChange,
}: {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  noun?: string;
  compact?: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const first = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, totalCount);
  const windowStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => windowStart + i);

  return (
    <div className="flex items-center justify-between mt-4">
      <p className={cn("text-muted-foreground whitespace-nowrap", compact ? "text-xs" : "text-sm")}>
        {compact ? (
          <>
            Showing {first}–{last} of {totalCount}
          </>
        ) : (
          <>
            Showing {first} to {last} of {totalCount} {noun}
          </>
        )}
      </p>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {pages.map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export function AdminSpinner({ className, large }: { className?: string; large?: boolean }) {
  return (
    <div className={cn("flex justify-center py-12", className)}>
      <div className={cn("animate-spin rounded-full border-b-2 border-admin-primary", large ? "h-12 w-12" : "h-8 w-8")} />
    </div>
  );
}
