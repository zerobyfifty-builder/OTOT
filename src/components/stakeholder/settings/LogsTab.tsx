import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { RefreshCw, Search, Activity } from "lucide-react";

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
  pageSize?: number;
}

export const LogsTab: React.FC<Props> = ({ organizationId, pageSize = 100 }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<Record<string, OrgUserLite>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

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
          .limit(pageSize),
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

      // Fallback: lookup any user_ids in logs that aren't in org_users (e.g. stakeholder owner)
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
    const u = users[uid];
    return u?.job_role || null;
  };

  const roleColor = (role: string | null | undefined) => {
    if (!role) return "bg-muted text-foreground";
    if (role.includes("admin")) return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    if (role.includes("manager")) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
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

  const filtered = logs.filter((l) => {
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
  });

  const actionColor = (action: string) => {
    if (action.includes("create") || action.includes("insert")) return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
    if (action.includes("update") || action.includes("edit")) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    if (action.includes("delete") || action.includes("remove")) return "bg-red-100 text-red-800 hover:bg-red-100";
    if (action.includes("login") || action.includes("auth")) return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    return "bg-muted text-foreground hover:bg-muted";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Activity Logs</CardTitle>
            <CardDescription>Track actions performed by users in your organization for accountability.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
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
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {userOptions.map((uid) => <SelectItem key={uid} value={uid}>{userName(uid)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No activity logs yet.</TableCell></TableRow>
              ) : filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}</div>
                    <div className="text-muted-foreground">{format(new Date(l.timestamp), "PP p")}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{userName(l.user_id)}</div>
                    {userLabel(l.user_id) && <div className="text-xs text-muted-foreground capitalize">{userLabel(l.user_id)?.replace(/_/g, " ")}</div>}
                  </TableCell>
                  <TableCell><Badge className={actionColor(l.action_type)}>{l.action_type}</Badge></TableCell>
                  <TableCell className="text-sm">{l.resource_type || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate" title={l.metadata?.description || ""}>
                    {l.metadata?.description || (l.resource_id ? `ID ${l.resource_id.substring(0, 8)}…` : "—")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
