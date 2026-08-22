"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecruitmentPostForm } from "./recruitment-post-form";
import type { RecruitmentPostType } from "@/lib/types/database";

export function CreatePostButton({ postType }: { postType: RecruitmentPostType }) {
  const t = useTranslations("recruitment");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="ns-btn-gold h-10 px-4 rounded-md text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        {postType === "LFT" ? t("postLft") : t("postLfp")}
      </button>
      {open && <RecruitmentPostForm postType={postType} open={open} onOpenChange={setOpen} />}
    </>
  );
}
