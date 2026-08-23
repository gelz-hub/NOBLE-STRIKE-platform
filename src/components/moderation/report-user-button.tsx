"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./report-dialog";
import { reportUser } from "@/app/actions/reports";

export function ReportUserButton({ userId, className }: { userId: string; className?: string }) {
  const t = useTranslations("moderation");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className={className ?? "h-9 px-3 text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive"}
      >
        <Flag className="w-3.5 h-3.5" />
        {t("reportUser")}
      </Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetId={userId} action={reportUser} />
    </>
  );
}
