"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./report-dialog";
import { reportRecruitmentPost } from "@/app/actions/reports";

export function ReportPostButton({ postId }: { postId: string }) {
  const t = useTranslations("moderation");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title={t("reportPost")}
        className="h-7 w-7 text-text-secondary hover:text-destructive"
      >
        <Flag className="w-3.5 h-3.5" />
      </Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetId={postId} action={reportRecruitmentPost} />
    </>
  );
}
