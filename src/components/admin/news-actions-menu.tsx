"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Archive, EyeOff, Loader2, Send, Trash2 } from "lucide-react";
import { unpublishNews, archiveNews, deleteNews, broadcastNewsToTelegram } from "@/app/admin/news/actions";

export function NewsActionsMenu({
  newsId,
  title,
  status,
  redirectOnDelete,
}: {
  newsId: string;
  title: string;
  status: string;
  redirectOnDelete?: boolean;
}) {
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
      {status === "PUBLISHED" && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => unpublishNews(newsId), "Unpublished.")}
          title="Unpublish"
          className="h-8 w-8 p-0 text-white/60 hover:text-amber-400"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
        </Button>
      )}
      {status === "PUBLISHED" && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => broadcastNewsToTelegram(newsId), "Broadcast to Telegram.")}
          title="Broadcast to Telegram"
          className="h-8 w-8 p-0 text-white/60 hover:text-gold-light"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      )}
      {status !== "ARCHIVED" && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => archiveNews(newsId), "Archived.")}
          title="Archive"
          className="h-8 w-8 p-0 text-white/60 hover:text-amber-400"
        >
          <Archive className="w-3.5 h-3.5" />
        </Button>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" title="Delete" className="h-8 w-8 p-0 text-white/60 hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-popover border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the article. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await deleteNews(newsId);
                  if ("error" in result) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Deleted.");
                  setDeleteOpen(false);
                  if (redirectOnDelete) router.push("/admin/news");
                  else router.refresh();
                });
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
