import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay } from "date-fns";
import { RefreshCw, Search, Activity, Trash2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  timestamp: string;
  user_id: string | null;
  organization_id: string | null;
  metadata: any;
  ip_address: unknown;
  user_agent: string | null;
}

interface OrgUserLite {
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_role: string;
}

interface Props {
  organizationId: string | null | undefined;
}

type CleanupRange = "yesterday" | "last_week" | "last_month" | "older_than_month" | "all";

const CLEANUP_LABELS: Record<CleanupRange, string> = {
  yesterday: "Yesterday only",
  last_week: "Last 7 days",
  last_month: "Last 30 days",
  older_than_month: "Older than 30 days",
  all: "All logs",
};

export const LogsTab: React.FC<Props> = ({ organizationId }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<Record<string, OrgUserLite>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [cleanupRange, setCleanupRange] = useState<CleanupRange>("older_than_month");
  const [deleting, setDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const fetchLogs = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [{ data: logRows, error: logErr }, { data: orgUserRows, error: orgUserErr }] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("*")
          .eq("organization_id", organizationId)
          .order("timestamp", { ascending: false })
          .limit(1000),
        supabase
          .from("org_users")
          .select("user_id, email, first_name, last_name, job_role")
          .eq("organization_id", organizationId),
      ]);
      if (logErr) throw logErr;
      if (orgUserErr) throw orgUserErr;

      const rows = (logRows as ActivityLog[]) || [];
      setLogs(rows);

      const map: Record<string, OrgUserLite> = {};
      (orgUserRows || []).forEach((u: any) => {
        if (u.user_id) map[u.user_id] = u;
      });

      const missingIds = Array.from(
        new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id && !map[id]))
      );
      if (missingIds.length > 0) {
        const { data: userRows } = await supabase
          .from("users")
          .select("user_id, email, first_name, last_name, role_id, roles(name)")
          .in("user_id", missingIds);
        (userRows || []).forEach((u: any) => {
          map[u.user_id] = {
            user_id: u.user_id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            job_role: u.roles?.name || "member",
          };
        });
      }
      setUsers(map);
    } catch (e) {
      console.error("Failed to load logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!organizationId) return;
    const channel = supabase
      .channel(`org-logs-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs", filter: `organization_id=eq.${organizationId}` },
        () => fetchLogs()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const userName = (uid: string | null) => {
    if (!uid) return "System";
    const u = users[uid];
    if (!u) return `User ${uid.substring(0, 8)}`;
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    return name || u.email;
  };

  const formatRole = (role: string | null | undefined) => {
    if (!role) return null;
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const userLabel = (uid: string | null) => {
    if (!uid) return null;
    return users[uid]?.job_role || null;
  };

  const roleColor = (role: string | null | undefined) => {
    if (!role) return "bg-muted text-foreground";
    if (role.includes("admin")) return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    if (role.includes("manager")) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    if (role.includes("finance")) return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    return "bg-slate-100 text-slate-800 hover:bg-slate-100";
  };

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action_type));
    return Array.from(set).sort();
  }, [logs]);

  const userOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l.user_id && set.add(l.user_id));
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => logs.filter((l) => {
    if (actionFilter !== "all" && l.action_type !== actionFilter) return false;
    if (userFilter !== "all" && l.user_id !== userFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const desc = (l.metadata?.description || "").toString().toLowerCase();
      if (
        !l.action_type.toLowerCase().includes(q) &&
        !(l.resource_type || "").toLowerCase().includes(q) &&
        !desc.includes(q) &&
        !userName(l.user_id).toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [logs, actionFilter, userFilter, search, users]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [actionFilter, userFilter, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const actionColor = (action: string) => {
    if (action.includes("create") || action.includes("insert")) return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
    if (action.includes("update") || action.includes("edit")) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    if (action.includes("delete") || action.includes("remove")) return "bg-red-100 text-red-800 hover:bg-red-100";
    if (action.includes("login") || action.includes("auth")) return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    return "bg-muted text-foreground hover:bg-muted";
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const computeCleanupBounds = (range: CleanupRange): { lt?: string; gte?: string; lte?: string } => {
    const now = new Date();
    switch (range) {
      case "yesterday": {
        const y = subDays(now, 1);
        return { gte: startOfDay(y).toISOString(), lte: endOfDay(y).toISOString() };
      }
      case "last_week":
        return { gte: subDays(now, 7).toISOString() };
      case "last_month":
        return { gte: subDays(now, 30).toISOString() };
      case "older_than_month":
        return { lt: subDays(now, 30).toISOString() };
      case "all":
      default:
        return {};
    }
  };

  const handleCleanup = async () => {
    if (!organizationId) return;
    setDeleting(true);
    try {
      const bounds = computeCleanupBounds(cleanupRange);
      let q = supabase.from("activity_logs").delete({ count: "exact" }).eq("organization_id", organizationId);
      if (bounds.gte) q = q.gte("timestamp", bounds.gte);
      if (bounds.lte) q = q.lte("timestamp", bounds.lte);
      if (bounds.lt) q = q.lt("timestamp", bounds.lt);

      const { error, count } = await q;
      if (error) throw error;
      toast.success(`Deleted ${count ?? 0} log entr${(count ?? 0) === 1 ? "y" : "ies"} (${CLEANUP_LABELS[cleanupRange]})`);
      await fetchLogs();
    } catch (e: any) {
      console.error("Cleanup failed", e);
      toast.error(e.message || "Failed to delete logs");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Activity Logs</CardTitle>
            <CardDescription>Track actions performed by users in your organization for accountability.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={cleanupRange} onValueChange={(v) => setCleanupRange(v as CleanupRange)}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CLEANUP_LABELS) as CleanupRange[]).map((k) => (
                  <SelectItem key={k} value={k}>{CLEANUP_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" /> Clear logs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete activity logs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete logs matching <strong>{CLEANUP_LABELS[cleanupRange]}</strong> for your
                    organization. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search action, user, or resource…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="All users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {userOptions.map((uid) => (
                <SelectItem key={uid} value={uid}>
                  <span className="flex items-center gap-2">
                    <span>{userName(uid)}</span>
                    {userLabel(uid) && (
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${roleColor(userLabel(uid))}`}>
                        {formatRole(userLabel(uid))}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No activity logs yet.</TableCell></TableRow>
              ) : pageRows.map((l) => (
                <React.Fragment key={l.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/60" onClick={() => toggleRowExpansion(l.id)}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}</div>
                      <div className="text-muted-foreground">{format(new Date(l.timestamp), "PP p")}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{userName(l.user_id)}</div>
                    </TableCell>
                    <TableCell>
                      {userLabel(l.user_id) ? (
                        <Badge variant="secondary" className={roleColor(userLabel(l.user_id))}>
                          {formatRole(userLabel(l.user_id))}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><Badge className={actionColor(l.action_type)}>{l.action_type}</Badge></TableCell>
                    <TableCell className="text-sm">{l.resource_type || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-2 flex-1">{l.metadata?.description || (l.resource_id ? `ID ${l.resource_id.substring(0, 8)}…` : "—")}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleRowExpansion(l.id); }}
                        >
                          {expandedRows.has(l.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(l.id) && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={6} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-semibold">Activity Details</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRowExpansion(l.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Description:</span>
                              <p className="mt-1 font-medium">{l.metadata?.description || "No description available"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Resource ID:</span>
                              <p className="mt-1 font-mono text-xs bg-muted px-2 py-1 rounded inline-block">{l.resource_id || "—"}</p>
                            </div>
                            {l.metadata?.old_value && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Previous Value:</span>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(l.metadata.old_value, null, 2)}</pre>
                              </div>
                            )}
                            {l.metadata?.new_value && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">New Value:</span>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">{JSON.stringify(l.metadata.new_value, null, 2)}</pre>
                              </div>
                            )}
                            {l.ip_address && (
                              <div>
                                <span className="text-muted-foreground">IP Address:</span>
                                <p className="mt-1 font-mono text-xs">{String(l.ip_address)}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={() => setSelectedLog(l)}>
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View Full Log
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2">
              {filtered.length === 0
                ? "0 entries"
                : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} of ${filtered.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Full Log Details Sheet */}
        <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <SheetContent className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Activity Log Details</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              {selectedLog && (
                <div className="space-y-6 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Timestamp</label>
                      <p className="text-sm font-medium">{format(new Date(selectedLog.timestamp), "PPP p")}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(selectedLog.timestamp), { addSuffix: true })}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Action</label>
                      <Badge className={actionColor(selectedLog.action_type)}>{selectedLog.action_type}</Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">User</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{userName(selectedLog.user_id)}</p>
                      {userLabel(selectedLog.user_id) && (
                        <Badge variant="secondary" className={roleColor(userLabel(selectedLog.user_id))}>
                          {formatRole(userLabel(selectedLog.user_id))}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Resource Type</label>
                      <p className="text-sm">{selectedLog.resource_type || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Resource ID</label>
                      <p className="text-sm font-mono text-xs bg-muted px-2 py-1 rounded inline-block">{selectedLog.resource_id || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedLog.metadata?.description || "No description available"}</p>
                  </div>

                  {(selectedLog.metadata?.old_value || selectedLog.metadata?.new_value) && (
                    <div className="space-y-3">
                      {selectedLog.metadata?.old_value && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Previous Value</label>
                          <pre className="text-xs bg-destructive/10 border border-destructive/20 p-3 rounded-md overflow-auto max-h-48">{JSON.stringify(selectedLog.metadata.old_value, null, 2)}</pre>
                        </div>
                      )}
                      {selectedLog.metadata?.new_value && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">New Value</label>
                          <pre className="text-xs bg-primary/10 border border-primary/20 p-3 rounded-md overflow-auto max-h-48">{JSON.stringify(selectedLog.metadata.new_value, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).filter(k => !['description', 'old_value', 'new_value'].includes(k)).length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Additional Metadata</label>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">{JSON.stringify(
                        Object.fromEntries(Object.entries(selectedLog.metadata).filter(([k]) => !['description', 'old_value', 'new_value'].includes(k))),
                        null, 2
                      )}</pre>
                    </div>
                  )}

                  {selectedLog.ip_address && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">IP Address</label>
                      <p className="text-sm font-mono">{String(selectedLog.ip_address)}</p>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">User Agent</label>
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded break-all">{selectedLog.user_agent}</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
};
