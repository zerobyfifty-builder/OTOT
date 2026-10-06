import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_LENGTH = 8;

/** Any role. Signs out other devices; this session stays signed in. */
export function ChangePasswordForm({
  currentLabel = "Current password",
  submitLabel = "Change password",
  onDone,
}: {
  currentLabel?: string;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem =
    next && next.length < MIN_LENGTH
      ? `Use at least ${MIN_LENGTH} characters.`
      : confirm && confirm !== next
        ? "The new passwords don't match."
        : next && next === current
          ? "Choose a password you haven't used here before."
          : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (problem || !current || !next || !confirm) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone?.();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pw-current">{currentLabel}</Label>
        <Input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw-new">New password</Label>
        <Input
          id="pw-new"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw-confirm">Confirm new password</Label>
        <Input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {(problem || error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? problem}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy || Boolean(problem) || !current || !next || !confirm}>
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
