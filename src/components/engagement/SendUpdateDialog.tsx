import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface SendUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributionId: string;
  contributorName: string;
  contributorEmail: string | null;
  totalTrees: number;
  plantingStatusLabel: string;
  anniversaryDate: string | null;
  photosCount: number;
  onSent: (subject: string, recipientEmail: string) => void;
}

export const SendUpdateDialog = ({
  open,
  onOpenChange,
  contributionId,
  contributorName,
  contributorEmail,
  totalTrees,
  plantingStatusLabel,
  anniversaryDate,
  photosCount,
  onSent,
}: SendUpdateDialogProps) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includeImpact, setIncludeImpact] = useState(true);
  const [recipient, setRecipient] = useState(contributorEmail || "");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(`Update on your trees — ${contributionId}`);
    const greeting = `Hi ${contributorName || "there"},`;
    const annLine = anniversaryDate
      ? `\nYour planting anniversary is on ${anniversaryDate}.`
      : "";
    setBody(
      `${greeting}\n\nWe wanted to share an update on the ${totalTrees} tree(s) you supported through One Tourist One Tree.\n\nCurrent status: ${plantingStatusLabel}.${annLine}\n\nThank you for your continued support of Kenya's reforestation efforts.\n\nWarm regards,\nKenya Tourism Board`,
    );
    setRecipient(contributorEmail || "");
    setIncludeImpact(true);
  }, [
    open,
    contributionId,
    contributorName,
    contributorEmail,
    totalTrees,
    plantingStatusLabel,
    anniversaryDate,
  ]);

  const handleSend = async () => {
    if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      toast.error("Please enter a valid recipient email");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    setSending(true);
    try {
      const finalBody = includeImpact
        ? `${body}\n\n— Impact summary —\nTrees: ${totalTrees}\nStatus: ${plantingStatusLabel}\nField photos captured: ${photosCount}`
        : body;

      const { data, error } = await supabase.functions.invoke(
        "send-contributor-update",
        {
          body: {
            contribution_id: contributionId,
            recipient_email: recipient,
            recipient_name: contributorName,
            subject,
            message: finalBody,
            include_impact_summary: includeImpact,
            impact: {
              total_trees: totalTrees,
              status: plantingStatusLabel,
              photos_count: photosCount,
              anniversary_date: anniversaryDate,
            },
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(`Update sent to ${recipient}`);
      onSent(subject, recipient);
      onOpenChange(false);
    } catch (err: any) {
      console.error("send-contributor-update error:", err);
      toast.error(err?.message || "Failed to send update");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send update to contributor</DialogTitle>
          <DialogDescription>
            Send a branded email update about this tree order to the contributor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="su-recipient">To</Label>
            <Input
              id="su-recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="contributor@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="su-subject">Subject</Label>
            <Input
              id="su-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="su-body">Message</Label>
            <Textarea
              id="su-body"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="su-impact"
              checked={includeImpact}
              onCheckedChange={(v) => setIncludeImpact(v === true)}
            />
            <Label htmlFor="su-impact" className="text-sm font-normal cursor-pointer">
              Include impact summary (trees, status, photos)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
