import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Building2, History, Landmark, Pencil, RefreshCw, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage, apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { kes, shortDate } from "@/lib/format";
import {
  PAYOUT_STATUS_LABEL,
  RECIPIENT_LABEL,
  SWEEP_MODE_LABEL,
  sweepModeDescription,
  type SweepMode,
} from "@/lib/payouts";
import { AdminSpinner } from "@/components/admin/TablePagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Payout, RecipientType, Wallet } from "@/types/otot";

type Owed = {
  recipientType: RecipientType;
  partnerId?: string;
  payableKes: number;
  unassignedKes: number;
  inFlightKes: number;
  transferredKes: number;
};

type WalletChange = {
  id: string;
  walletId: string;
  ownerType: RecipientType;
  partnerId?: string;
  oldPhone?: string;
  newPhone: string;
  changedBy?: string;
  changedByName?: string;
  changedAt: string;
};

type Overview = {
  wallets: Wallet[];
  balance: {
    grossKes: number;
    afrinetFeeKes: number;
    payoutFeeReserveKes: number;
    creditedKes: number;
    committedKes: number;
    availableKes: number;
  };
  owed: Owed[];
  unmatchedLegacy: {
    recipientType: RecipientType;
    partnerId?: string;
    amountKes: number;
  }[];
  sweep: { mode: SweepMode; hourEat: number; lastPayout: Payout | null };
  minPayoutKes: number;
  kesPerUsd: number;
  sdkConfigured: boolean;
  /** Most recent first. */
  changes: WalletChange[];
  /** Demo numbers the API refuses for live payouts. */
  placeholderPhones: string[];
  live: boolean;
};

type Editing = {
  ownerType: RecipientType;
  partnerId?: string;
  name: string;
  current?: string;
  phone: string;
  confirmPhone: string;
};

/** Rough client-side normalisation (07… / 7… / 2547…); the API does the real check. */
function digits(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) return `254${d.slice(1)}`;
  if (d.length === 9) return `254${d}`;
  return d;
}
const changedAt = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");

const HOURS = Array.from({ length: 24 }, (_, h) => h);

const emptyOwed = (): Owed => ({
  recipientType: "partner",
  payableKes: 0,
  unassignedKes: 0,
  inFlightKes: 0,
  transferredKes: 0,
});

export default function AdminWallets() {
  const { state, refresh: refreshStore } = useStore();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch<Overview>("/v1/admin/wallets"));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const wallet = (type: RecipientType, partnerId?: string) =>
    data?.wallets.find((w) => w.ownerType === type && (type !== "partner" || w.partnerId === partnerId));
  const owed = (type: RecipientType, partnerId?: string) => {
    const rows =
      data?.owed.filter((o) => o.recipientType === type && (type !== "partner" || o.partnerId === partnerId)) ?? [];
    return rows.reduce(
      (acc, o) => ({
        ...acc,
        payableKes: acc.payableKes + o.payableKes,
        inFlightKes: acc.inFlightKes + o.inFlightKes,
        transferredKes: acc.transferredKes + o.transferredKes,
      }),
      emptyOwed(),
    );
  };
  const unassignedKes = data?.owed.reduce((s, o) => s + o.unassignedKes, 0) ?? 0;
  const isPlaceholder = (phone?: string) => Boolean(phone && data?.placeholderPhones.includes(phone));
  const lastChange = (w?: Wallet) => (w ? data?.changes.find((c) => c.walletId === w.id) : undefined);
  const placeholderCount = data?.wallets.filter((w) => isPlaceholder(w.mpesaPhone)).length ?? 0;
  const vendorName = new Map(state.vendors.map((v) => [v.id, v.name]));
  const changeLabel = (c: WalletChange) =>
    c.ownerType === "partner" ? (vendorName.get(c.partnerId ?? "") ?? "Partner") : RECIPIENT_LABEL[c.ownerType];
  const startEdit = (ownerType: RecipientType, name: string, partnerId?: string) =>
    setEditing({
      ownerType,
      partnerId,
      name,
      current: wallet(ownerType, partnerId)?.mpesaPhone,
      phone: "",
      confirmPhone: "",
    });
  const phonesMatch = Boolean(editing && digits(editing.phone) && digits(editing.phone) === digits(editing.confirmPhone));
  const unmatched = (type: RecipientType, partnerId?: string) =>
    data?.unmatchedLegacy
      .filter((u) => u.recipientType === type && (type !== "partner" || u.partnerId === partnerId))
      .reduce((s, u) => s + u.amountKes, 0) ?? 0;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch("/v1/admin/wallets", {
        method: "PUT",
        body: JSON.stringify({
          ownerType: editing.ownerType,
          partnerId: editing.partnerId,
          mpesaPhone: editing.phone,
          confirmMpesaPhone: editing.confirmPhone,
        }),
      });
      toast.success(`${editing.name} wallet saved`);
      setEditing(null);
      await Promise.all([load(), refreshStore()]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const [savingMode, setSavingMode] = useState(false);
  const saveSweep = async (next: { mode: SweepMode; hourEat: number }) => {
    setSavingMode(true);
    try {
      await apiFetch("/v1/admin/wallets/otot/sweep-settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      toast.success(`OTOT fee transfer: ${sweepModeDescription(next.mode, next.hourEat).toLowerCase()}`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingMode(false);
    }
  };

  const sweepNow = async () => {
    setSweeping(true);
    try {
      const { payout } = await apiFetch<{ payout: Payout }>("/v1/admin/wallets/otot/sweep", { method: "POST" });
      toast.success(`Sent ${kes(payout.amountKes)} to the OTOT wallet (${PAYOUT_STATUS_LABEL[payout.status]}).`);
      await Promise.all([load(), refreshStore()]);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      await load();
    } finally {
      setSweeping(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8">
        <AdminSpinner large />
      </div>
    );
  }

  const otot = owed("otot");
  const ministry = owed("ministry");
  const lastSweep = data?.sweep.lastPayout;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Wallets</h1>
          <p className="text-muted-foreground mt-1">
            The M-Pesa numbers that receive each share of a donation. Send Ministry and vendor payouts from Financial
            Transactions.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh wallets"
          disabled={loading}
          onClick={() => {
            void load();
            void refreshStore();
          }}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      {placeholderCount > 0 && (
        <p
          className={
            data?.live
              ? "flex gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              : "flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          }
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          {placeholderCount} {placeholderCount === 1 ? "wallet still has a demo number" : "wallets still have demo numbers"}.
          {data?.live
            ? " Live payouts to them are refused. Replace them with the real M-Pesa numbers before paying anyone."
            : " Replace them with the real M-Pesa numbers before going live; live payouts to demo numbers are refused."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Calculated Afrinet balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{kes(data?.balance.availableKes ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Received after fee − every payout sent or in progress. Afrinet has no balance API, so reconcile with the
              merchant portal.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Received after Afrinet fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{kes(data?.balance.creditedKes ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {kes(data?.balance.grossKes ?? 0)} collected − {kes(data?.balance.afrinetFeeKes ?? 0)} collection fee −{" "}
              {kes(data?.balance.payoutFeeReserveKes ?? 0)} reserved for payout transfer fees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Paid out or in progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{kes(data?.balance.committedKes ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-2">OTOT fee transfers, Ministry fees and vendor payouts</p>
          </CardContent>
        </Card>
      </div>

      {!data?.sdkConfigured && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Afrinet credentials are not configured in this environment. Payouts are simulated and marked Transferred
          immediately.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <WalletCard
          icon={Smartphone}
          title="OTOT Platform wallet"
          description={
            data
              ? `Receives the OTOT tech processing fee. ${sweepModeDescription(data.sweep.mode, data.sweep.hourEat)}.`
              : ""
          }
          wallet={wallet("otot")}
          placeholder={isPlaceholder(wallet("otot")?.mpesaPhone)}
          live={Boolean(data?.live)}
          lastChange={lastChange(wallet("otot"))}
          onEdit={() => startEdit("otot", "OTOT Platform")}
          stats={[
            { label: "Pending", value: otot.payableKes },
            { label: "In progress", value: otot.inFlightKes },
            { label: "Transferred", value: otot.transferredKes },
          ]}
          footer={
            <div className="space-y-3">
              {data && (
                <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Transfer OTOT fee</Label>
                    <Select
                      value={data.sweep.mode}
                      disabled={savingMode}
                      onValueChange={(mode) =>
                        void saveSweep({
                          mode: mode as SweepMode,
                          hourEat: data.sweep.hourEat,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 w-[190px]" aria-label="OTOT fee transfer mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SWEEP_MODE_LABEL) as SweepMode[]).map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {SWEEP_MODE_LABEL[mode]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {data.sweep.mode === "daily" && (
                    <div className="space-y-1">
                      <Label className="text-xs">At (EAT)</Label>
                      <Select
                        value={String(data.sweep.hourEat)}
                        disabled={savingMode}
                        onValueChange={(hour) =>
                          void saveSweep({
                            mode: "daily",
                            hourEat: Number(hour),
                          })
                        }
                      >
                        <SelectTrigger className="h-9 w-[100px]" aria-label="End-of-day transfer hour">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {String(h).padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {lastSweep ? (
                    <>
                      Last transfer {shortDate(lastSweep.createdAt)} · {kes(lastSweep.amountKes)} ·{" "}
                      {PAYOUT_STATUS_LABEL[lastSweep.status]}.
                    </>
                  ) : (
                    "No transfers yet."
                  )}{" "}
                  Amounts below {kes(data?.minPayoutKes ?? 10)} wait for the next transfer.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sweeping || !wallet("otot") || otot.payableKes < (data?.minPayoutKes ?? 10)}
                  onClick={() => void sweepNow()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sweeping ? "Sending…" : `Transfer now ${kes(otot.payableKes)}`}
                </Button>
              </div>
            </div>
          }
        />
        <WalletCard
          icon={Landmark}
          title="Ministry wallet"
          description="Receives the Ministry admin fee (15% after Afrinet fees)."
          wallet={wallet("ministry")}
          placeholder={isPlaceholder(wallet("ministry")?.mpesaPhone)}
          live={Boolean(data?.live)}
          lastChange={lastChange(wallet("ministry"))}
          onEdit={() => startEdit("ministry", "Ministry")}
          stats={[
            { label: "Pending", value: ministry.payableKes },
            { label: "In progress", value: ministry.inFlightKes },
            { label: "Transferred", value: ministry.transferredKes },
          ]}
          footer={
            unmatched("ministry") > 0 ? (
              <p className="text-xs text-amber-700">
                {kes(unmatched("ministry"))} sent before the ledger could not be matched to whole donations. Deduct it
                from the next Ministry payout.
              </p>
            ) : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Partner wallets
          </CardTitle>
          <CardDescription>
            A partner's share becomes payable as soon as the Ministry assigns them a request.{" "}
            {unassignedKes > 0 && <>{kes(unassignedKes)} is still awaiting Ministry assignment.</>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>M-Pesa number</TableHead>
                  <TableHead>Last changed</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">In progress</TableHead>
                  <TableHead className="text-right">Transferred</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No partners yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.vendors.map((v) => {
                    const w = wallet("partner", v.id);
                    const o = owed("partner", v.id);
                    const legacy = unmatched("partner", v.id);
                    const change = lastChange(w);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.region} {v.status === "inactive" && <StatusBadge status="inactive" />}
                          </div>
                          {legacy > 0 && (
                            <div className="text-xs text-amber-700 mt-1">
                              {kes(legacy)} pre-ledger transfer not matched to donations
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {w?.mpesaPhone ?? <span className="font-sans text-destructive">Not set</span>}
                          {isPlaceholder(w?.mpesaPhone) && (
                            <div
                              className={`font-sans text-xs mt-1 ${data?.live ? "text-destructive font-medium" : "text-amber-700"}`}
                            >
                              Demo number — replace before live payouts
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {change ? (
                            <>
                              <div>{change.changedByName ?? "System"}</div>
                              <div>{changedAt(change.changedAt)}</div>
                            </>
                          ) : w ? (
                            shortDate(w.updatedAt)
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{kes(o.payableKes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{kes(o.inFlightKes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{kes(o.transferredKes)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit("partner", v.name, v.id)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            {w ? "Edit" : "Add"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent wallet changes
          </CardTitle>
          <CardDescription>Every change to a payout number, newest first (last 50).</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.changes.length ? (
            <p className="text-sm text-muted-foreground">No wallet changes recorded yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Changed by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.changes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap text-sm">{changedAt(c.changedAt)}</TableCell>
                      <TableCell className="font-medium">{changeLabel(c)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.oldPhone ?? "— (new wallet)"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.newPhone}</TableCell>
                      <TableCell className="text-sm">{c.changedByName ?? "System"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing?.name} M-Pesa wallet</DialogTitle>
            <DialogDescription>
              Future {editing ? RECIPIENT_LABEL[editing.ownerType].toLowerCase() : ""} payouts go to this number. A wrong
              number sends real money to a stranger, so it is typed twice. Past payouts keep the number they were sent
              to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editing?.current && (
              <p className="text-sm">
                Current number: <span className="font-mono">{editing.current}</span>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="wallet-phone">New M-Pesa number</Label>
              <Input
                id="wallet-phone"
                inputMode="tel"
                autoComplete="off"
                placeholder="2547XXXXXXXX"
                value={editing?.phone ?? ""}
                onChange={(e) => editing && setEditing({ ...editing, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-phone-confirm">Type it again</Label>
              <Input
                id="wallet-phone-confirm"
                inputMode="tel"
                autoComplete="off"
                placeholder="2547XXXXXXXX"
                value={editing?.confirmPhone ?? ""}
                onPaste={(e) => e.preventDefault()}
                onChange={(e) => editing && setEditing({ ...editing, confirmPhone: e.target.value })}
              />
              {editing?.confirmPhone && !phonesMatch && (
                <p className="text-xs text-destructive">The two numbers don't match.</p>
              )}
              {editing && phonesMatch && isPlaceholder(digits(editing.phone)) && (
                <p className="text-xs text-amber-700">This is a demo number. Live payouts to it are refused.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={saving || !phonesMatch} onClick={() => void save()}>
              {saving ? "Saving…" : "Save number"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WalletCard({
  icon: Icon,
  title,
  description,
  wallet,
  placeholder,
  live,
  lastChange,
  onEdit,
  stats,
  footer,
}: {
  icon: typeof Smartphone;
  title: string;
  description: string;
  wallet?: Wallet;
  placeholder: boolean;
  live: boolean;
  lastChange?: WalletChange;
  onEdit: () => void;
  stats: { label: string; value: number }[];
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            {wallet ? "Edit" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="font-mono text-lg">
            {wallet?.mpesaPhone ?? <span className="font-sans text-sm text-destructive">No M-Pesa number set</span>}
          </div>
          {placeholder && (
            <p className={`text-xs mt-1 ${live ? "text-destructive font-medium" : "text-amber-700"}`}>
              Demo number — replace before live payouts
            </p>
          )}
          {wallet && (
            <p className="text-xs text-muted-foreground mt-1">
              {lastChange
                ? `Last changed by ${lastChange.changedByName ?? "System"} on ${changedAt(lastChange.changedAt)}`
                : `Last updated ${shortDate(wallet.updatedAt)}`}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {stats.map((s) => (
            <div key={s.label} className="rounded border p-2">
              <span className="block text-xs text-muted-foreground">{s.label}</span>
              <strong className="tabular-nums">{kes(s.value)}</strong>
            </div>
          ))}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
