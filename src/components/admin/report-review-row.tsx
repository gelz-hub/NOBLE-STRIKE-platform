"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, X } from "lucide-react";
import { resolveReport, dismissReport, type AdminReportRow } from "@/app/admin/moderation/actions";
import { REPORT_REASON_LABELS } from "@/lib/validation/report";

const ACTIONS_FOR_TYPE: Record<"USER" | "RECRUITMENT_POST", { value: string; label: string }[]> = {
  USER: [
    { value: "NONE", label: "No action" },
    { value: "FLAG_ACCOUNT", label: "Flag account" },
  ],
  RECRUITMENT_POST: [
    { value: "NONE", label: "No action" },
    { value: "REMOVE_POST", label: "Remove post" },
  ],
};

export function ReportReviewRow({ report }: { report: AdminReportRow }) {
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState("NONE");
  const [note, setNote] = useState("");

  function handleResolve() {
    startTransition(async () => {
      const result = await resolveReport(
        report.id,
        report.target_type,
        report.target_id,
        action as "NONE" | "FLAG_ACCOUNT" | "REMOVE_POST",
        note
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Report resolved.");
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissReport(report.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Report dismissed.");
    });
  }

  return (
    <div className="ns-card rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            {report.target_type === "USER" ? "Reported User" : "Reported Post"} ·{" "}
            <span className="text-gold-light">{REPORT_REASON_LABELS[report.reason]}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reported by {report.reporter?.username ?? "unknown"} on{" "}
            {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
        <span className="ns-pill ns-pill-pending shrink-0">{report.status}</span>
      </div>

      {report.details && <p className="text-sm text-white/80 bg-black/30 rounded-md p-2">{report.details}</p>}

      <p className="text-xs text-muted-foreground">
        Target ID: <code className="text-white/70">{report.target_id}</code>
      </p>

      {report.status === "PENDING" && (
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-gold/10">
          <div className="space-y-1">
            <label className="text-[0.65rem] text-muted-foreground">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="ns-input h-9 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {ACTIONS_FOR_TYPE[report.target_type].map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="ns-input h-9 flex-1 min-w-40 text-xs"
          />
          <Button
            type="button"
            disabled={pending}
            onClick={handleResolve}
            className="ns-btn-gold h-9 px-3 text-xs uppercase tracking-wider"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Resolve
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={handleDismiss}
            className="h-9 px-3 text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
