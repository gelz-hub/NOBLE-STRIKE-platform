"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Pencil, Send, Trash2, Unlock } from "lucide-react";
import { setRecruitmentPostStatus, deleteRecruitmentPost } from "@/app/recruitment/actions";
import { getRoleLabels } from "@/lib/validation/recruitment";
import { RecruitmentPostForm } from "./recruitment-post-form";
import type { RecruitmentPost } from "@/lib/types/database";

const GAME_LABELS: Record<string, string> = { MLBB: "Mobile Legends: Bang Bang", HOK: "Honor of Kings" };

export function RecruitmentPostCard({
  post,
  canManage,
}: {
  post: RecruitmentPost;
  canManage: boolean;
}) {
  const t = useTranslations("recruitment");
  const tCommon = useTranslations("common");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleToggleStatus() {
    startTransition(async () => {
      const result = await setRecruitmentPostStatus(post.id, post.status === "OPEN" ? "CLOSED" : "OPEN");
      if ("error" in result) toast.error(result.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRecruitmentPost(post.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("postDeleted"));
      setDeleteOpen(false);
    });
  }

  return (
    <div className="ns-card rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-text-primary truncate">{post.title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {GAME_LABELS[post.game]} · {getRoleLabels(post.game)[post.role]}
          </p>
        </div>
        <span className={`ns-pill shrink-0 ${post.status === "OPEN" ? "ns-pill-open" : "ns-pill-closed"}`}>
          {post.status === "OPEN" ? t("statusOpen") : t("statusClosed")}
        </span>
      </div>

      {post.post_type === "LFT" && (
        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          {post.rank && <span>{t("rankLabel")}: {post.rank}</span>}
          {post.country && <span>{post.country}</span>}
        </div>
      )}
      {post.post_type === "LFP" && post.requirements && (
        <p className="text-xs text-text-secondary">
          <span className="text-text-primary/80 font-medium">{t("requirementsLabel")}:</span> {post.requirements}
        </p>
      )}

      <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{post.description}</p>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gold/10">
        <a
          href={`https://t.me/${post.telegram_username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gold-light hover:underline"
        >
          <Send className="w-3.5 h-3.5" />@{post.telegram_username}
        </a>

        {canManage && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={() => setEditOpen(true)}
              title={tCommon("edit")}
              className="h-7 w-7 text-text-secondary hover:text-gold-light"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={handleToggleStatus}
              title={post.status === "OPEN" ? t("close") : t("reopen")}
              className="h-7 w-7 text-text-secondary hover:text-amber-400"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : post.status === "OPEN" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </Button>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={tCommon("delete")}
                  className="h-7 w-7 text-text-secondary hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-popover border-gold/30">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-text-primary">{t("deletePostConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("deletePostConfirmBody")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pending}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : tCommon("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {editOpen && (
        <RecruitmentPostForm postType={post.post_type} open={editOpen} onOpenChange={setEditOpen} post={post} />
      )}
    </div>
  );
}
