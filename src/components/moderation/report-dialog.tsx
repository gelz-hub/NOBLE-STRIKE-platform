"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";
import { REPORT_REASONS } from "@/lib/validation/report";
import type { ActionResult } from "@/app/actions/reports";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("moderation");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-10 px-5">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
      {pending ? t("submitting") : t("submitReport")}
    </Button>
  );
}

/** Shared "Report User" / "Report Post" dialog — the action determines what gets reported. */
export function ReportDialog({
  open,
  onOpenChange,
  targetId,
  action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const t = useTranslations("moderation");
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(t("reportSubmitted"));
      onOpenChange(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-gold/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">{t("reportDialogTitle")}</DialogTitle>
          <DialogDescription>{t("reportDialogDescription")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="target_id" value={targetId} />
          <input type="hidden" name="reason" value={reason} />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("reasonLabel")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("detailsLabel")}</Label>
            <Textarea name="details" maxLength={500} placeholder={t("detailsPlaceholder")} className="ns-input min-h-20" />
          </div>

          {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end pt-2 border-t border-gold/10">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
