"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { pickLocalized } from "@/lib/i18n/content";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TeamMonogram } from "@/components/ns/ui";
import { Check, Crown, Eye, Loader2, Phone, Send, X } from "lucide-react";
import {
  approveRegistration,
  getTeamRosterForReview,
  rejectRegistration,
  type AdminRegistrationRow,
} from "@/app/admin/registrations/actions";
import type { Team, TeamMember } from "@/lib/types/database";
import type { Locale } from "@/i18n/config";

export function RegistrationReviewPanel({
  registration,
  onDone,
}: {
  registration: AdminRegistrationRow;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [pending, startTransition] = useTransition();
  const locale = useLocale() as Locale;
  const t = useTranslations("admin.registrations");
  const tournamentName = registration.tournaments
    ? pickLocalized(registration.tournaments, "name", locale)
    : null;

  async function handleOpen(next: boolean) {
    setOpen(next);
    if (next && registration.teams) {
      setLoading(true);
      const data = await getTeamRosterForReview(registration.teams.id);
      setTeam(data.team as Team | null);
      setMembers(data.members as TeamMember[]);
      setLoading(false);
    }
  }

  const captain = members.find((m) => m.is_captain);
  const isPending = registration.status === "PENDING";

  function handleApprove() {
    startTransition(async () => {
      const result = await approveRegistration(registration.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("approveSuccess"));
      setOpen(false);
      onDone?.();
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      toast.error(t("rejectReasonRequired"));
      return;
    }
    startTransition(async () => {
      const result = await rejectRegistration(registration.id, rejectReason);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("rejectSuccess"));
      setOpen(false);
      onDone?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => handleOpen(true)}
        className="h-8 px-3 text-xs uppercase tracking-wider text-gold hover:text-gold-light"
      >
        <Eye className="w-3.5 h-3.5" />
        {t("review")}
      </Button>

      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-popover border-gold/30">
        <DialogTitle className="text-white font-display">
          {registration.teams?.team_name}
        </DialogTitle>
        <DialogDescription lang={locale}>
          {t("registrationFor", { tournament: tournamentName ?? "" })}
        </DialogDescription>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {team?.banner_url && (
              <div className="relative h-32 w-full rounded-lg overflow-hidden border border-gold/20">
                <Image src={team.banner_url} alt="" fill sizes="600px" className="object-cover" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <TeamMonogram name={registration.teams?.team_name ?? "?"} logo={team?.logo_url} size={56} />
              <div>
                <p className="font-heading font-bold text-white">{registration.teams?.team_name}</p>
                {captain && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Crown className="w-3 h-3 text-gold" />
                    {t("captainLabel", { name: captain.player_name })}
                  </p>
                )}
              </div>
            </div>

            {(team?.captain_telegram || team?.contact_number) && (
              <div className="ns-card rounded-lg p-3 space-y-1.5">
                <p className="text-[0.65rem] font-heading font-semibold uppercase tracking-wider text-gold-light">
                  {t("captainContact")}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {team?.captain_telegram && (
                    <div className="flex items-center gap-2 text-sm">
                      <Send className="w-3.5 h-3.5 text-gold/70 shrink-0" />
                      <span className="text-white/90 truncate">{team.captain_telegram}</span>
                    </div>
                  )}
                  {team?.contact_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3.5 h-3.5 text-gold/70 shrink-0" />
                      <span className="text-white/90 truncate">{team.contact_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-2">
                {t("roster", { count: members.length })}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm"
                  >
                    <span className="text-[0.65rem] uppercase tracking-wider text-gold/70 w-14 shrink-0">
                      {m.role}
                    </span>
                    <span className="text-white/90 truncate">{m.player_name}</span>
                    {m.is_captain && <Crown className="w-3 h-3 text-gold shrink-0 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>

            {isPending && (
              <div className="pt-4 border-t border-gold/10 space-y-3">
                {showRejectInput && (
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("rejectReasonPlaceholder")}
                    className="ns-input text-sm"
                  />
                )}
                <div className="flex justify-end gap-2">
                  {showRejectInput ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={handleReject}
                      className="h-10 px-4 text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 border border-destructive/30"
                    >
                      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      {t("confirmReject")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowRejectInput(true)}
                      className="h-10 px-4 text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 border border-destructive/30"
                    >
                      <X className="w-4 h-4" />
                      {t("reject")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={handleApprove}
                    className="ns-btn-gold h-10 px-5 text-xs uppercase tracking-wider"
                  >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t("approve")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
