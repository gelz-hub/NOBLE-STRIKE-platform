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
import { Archive, Copy, Loader2, Send, Trash2 } from "lucide-react";
import {
  archiveTournament,
  broadcastTournamentToTelegram,
  deleteTournament,
  duplicateTournament,
} from "@/app/admin/tournaments/actions";

export function TournamentActionsMenu({
  tournamentId,
  title,
  redirectOnDelete,
}: {
  tournamentId: string;
  title: string;
  redirectOnDelete?: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTournament(tournamentId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Tournament duplicated.");
      router.refresh();
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveTournament(tournamentId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Tournament archived.");
      router.refresh();
    });
  }

  function handleBroadcast() {
    startTransition(async () => {
      const result = await broadcastTournamentToTelegram(tournamentId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Broadcast to Telegram.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTournament(tournamentId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Tournament deleted.");
      setDeleteOpen(false);
      if (redirectOnDelete) router.push("/admin/tournaments");
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={handleDuplicate}
        title="Duplicate"
        className="h-8 w-8 p-0 text-white/60 hover:text-gold-light"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={handleArchive}
        title="Archive"
        className="h-8 w-8 p-0 text-white/60 hover:text-amber-400"
      >
        <Archive className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={handleBroadcast}
        title="Broadcast to Telegram"
        className="h-8 w-8 p-0 text-white/60 hover:text-gold-light"
      >
        <Send className="w-3.5 h-3.5" />
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            title="Delete"
            className="h-8 w-8 p-0 text-white/60 hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-popover border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the tournament and its matches/registrations. Tournaments
              with approved teams can&apos;t be deleted — archive them instead. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
