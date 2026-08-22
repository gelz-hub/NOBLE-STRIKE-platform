"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Trash2 } from "lucide-react";
import { deleteTeam } from "@/app/dashboard/teams/actions";

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const t = useTranslations("dashboard.team");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-4 text-xs uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t("deleteTeam")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-popover border-gold/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            {t("deleteTeamConfirmTitle", { teamName })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("deleteTeamConfirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await deleteTeam(teamId);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                toast.success(t("teamDeleted"));
                setOpen(false);
                router.push("/dashboard/teams");
              });
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
