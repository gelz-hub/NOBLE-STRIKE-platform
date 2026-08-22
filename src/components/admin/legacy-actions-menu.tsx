"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { deleteLegacyEvent, togglePublishLegacyEvent } from "@/app/admin/legacy/actions";

export function LegacyActionsMenu({
  eventId,
  title,
  isPublished,
}: {
  eventId: string;
  title: string;
  isPublished: boolean;
}) {
  const t = useTranslations("admin.legacy");
  const tCommon = useTranslations("common");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error: string } | { success: true }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(
            () => togglePublishLegacyEvent(eventId, !isPublished),
            isPublished ? t("toasts.unpublished") : t("toasts.published")
          )
        }
        title={isPublished ? t("unpublish") : t("publish")}
        className="h-8 w-8 p-0 text-white/60 hover:text-amber-400"
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isPublished ? (
          <EyeOff className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" title={t("delete")} className="h-8 w-8 p-0 text-white/60 hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-popover border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t("deleteConfirmTitle", { title })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await deleteLegacyEvent(eventId);
                  if ("error" in result) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(t("toasts.deleted"));
                  setDeleteOpen(false);
                  router.refresh();
                });
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tCommon("deleting")}
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
