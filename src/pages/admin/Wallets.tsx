import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Building2, Landmark, Pencil, RefreshCw, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage, apiFetch } from "@/lib/api";
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

type Overview = {
  wallets: Wallet[];
  balance: {
    grossKes: number;
    afrinetFeeKes: number;
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
};

type Editing = {
  ownerType: RecipientType;
  partnerId?: string;
  name: string;
  phone: string;
};

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
            <CardTitle className="text-sm">Received after Afrinet fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{kes(data?.balance.creditedKes ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {kes(data?.balance.grossKes ?? 0)} collected − {kes(data?.balance.afrinetFeeKes ?? 0)} fee (2.9%)
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
          onEdit={() =>
            setEditing({
              ownerType: "otot",
              name: "OTOT Platform",
              phone: wallet("otot")?.mpesaPhone ?? "",
            })
          }
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
          description="Receives the Ministry admin fee (15% after the Afrinet fee)."
          wallet={wallet("ministry")}
          onEdit={() =>
            setEditing({
              ownerType: "ministry",
              name: "Ministry",
              phone: wallet("ministry")?.mpesaPhone ?? "",
            })
          }
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
            Vendors receive their payout only for donations the Ministry assigned to them.{" "}
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
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">In progress</TableHead>
                  <TableHead className="text-right">Transferred</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No partners yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.vendors.map((v) => {
                    const w = wallet("partner", v.id);
                    const o = owed("partner", v.id);
                    const legacy = unmatched("partner", v.id);
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
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{kes(o.payableKes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{kes(o.inFlightKes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{kes(o.transferredKes)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditing({
                                ownerType: "partner",
                                partnerId: v.id,
                                name: v.name,
                                phone: w?.mpesaPhone ?? "",
                              })
                            }
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

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing?.name} M-Pesa wallet</DialogTitle>
            <DialogDescription>
              Future {editing ? RECIPIENT_LABEL[editing.ownerType].toLowerCase() : ""} payouts go to this number. Past
              payouts keep the number they were sent to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wallet-phone">M-Pesa number</Label>
            <Input
              id="wallet-phone"
              inputMode="tel"
              placeholder="2547XXXXXXXX"
              value={editing?.phone ?? ""}
              onChange={(e) => editing && setEditing({ ...editing, phone: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={saving || !editing?.phone.trim()} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
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
  onEdit,
  stats,
  footer,
}: {
  icon: typeof Smartphone;
  title: string;
  description: string;
  wallet?: Wallet;
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
        <div className="font-mono text-lg">
          {wallet?.mpesaPhone ?? <span className="font-sans text-sm text-destructive">No M-Pesa number set</span>}
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
