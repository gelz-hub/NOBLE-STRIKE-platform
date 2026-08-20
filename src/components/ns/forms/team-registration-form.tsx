"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiPost, useFetch } from "../hooks";
import { TeamMonogram } from "../ui";
import { X, Users, Shield, Gamepad2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tournament } from "@/lib/types";

interface Props {
  defaultTournamentId?: string;
  onClose: () => void;
  onSuccess?: (teamId: string) => void;
}

export function TeamRegistrationForm({
  defaultTournamentId,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    logo: "",
    captainName: "",
    discordUsername: "",
    contactNumber: "",
    game: "MLBB",
    tournamentId: defaultTournamentId || "",
    player1: "",
    player2: "",
    player3: "",
    player4: "",
    player5: "",
    substitute: "",
    region: "",
    tag: "",
  });

  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.captainName || !form.discordUsername) {
      toast.error("Please fill team name, captain, and Discord.");
      return;
    }
    if (
      !form.player1 ||
      !form.player2 ||
      !form.player3 ||
      !form.player4 ||
      !form.player5
    ) {
      toast.error("All 5 starting players are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ id: string; error?: string }>("/api/teams", {
        ...form,
        logo: form.logo || null,
        substitute: form.substitute || null,
        region: form.region || null,
        tag: form.tag || null,
      });
      onSuccess?.(res.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-[#0d0d0d] border-gold/30 p-0">
        {/* Header banner */}
        <div className="relative h-28 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black border-b border-gold/20 overflow-hidden">
          <div className="absolute inset-0 ns-grid-bg opacity-40" />
          <div className="absolute inset-0 ns-radial-gold" />
          <div className="absolute inset-0 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gold" />
              </div>
              <div>
                <DialogTitle className="font-display font-bold text-xl text-white">
                  Register Your Team
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Complete the roster to enter the arena.
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Team identity */}
          <FormSection icon={Users} title="Team Identity">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Team Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Eclipse Empire"
                  className="bg-black/40 border-gold/20 focus:border-gold/60"
                />
              </Field>
              <Field label="Team Tag">
                <Input
                  value={form.tag}
                  onChange={(e) => set("tag", e.target.value)}
                  placeholder="e.g. ECL"
                  maxLength={6}
                  className="bg-black/40 border-gold/20 focus:border-gold/60 uppercase"
                />
              </Field>
              <Field label="Team Logo URL" full>
                <div className="flex items-center gap-3">
                  <TeamMonogram name={form.name || "?"} logo={form.logo} size={44} />
                  <Input
                    value={form.logo}
                    onChange={(e) => set("logo", e.target.value)}
                    placeholder="https://... (optional)"
                    className="bg-black/40 border-gold/20 focus:border-gold/60"
                  />
                </div>
              </Field>
            </div>
          </FormSection>

          {/* Captain & contact */}
          <FormSection icon={Shield} title="Captain & Contact">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Captain Name" required>
                <Input
                  value={form.captainName}
                  onChange={(e) => set("captainName", e.target.value)}
                  placeholder="Captain's real name"
                  className="bg-black/40 border-gold/20 focus:border-gold/60"
                />
              </Field>
              <Field label="Discord Username" required>
                <Input
                  value={form.discordUsername}
                  onChange={(e) => set("discordUsername", e.target.value)}
                  placeholder="username or username#0000"
                  className="bg-black/40 border-gold/20 focus:border-gold/60"
                />
              </Field>
              <Field label="Contact Number" required>
                <Input
                  value={form.contactNumber}
                  onChange={(e) => set("contactNumber", e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="bg-black/40 border-gold/20 focus:border-gold/60"
                />
              </Field>
              <Field label="Region">
                <Input
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  placeholder="e.g. SEA, NA, EU"
                  className="bg-black/40 border-gold/20 focus:border-gold/60"
                />
              </Field>
            </div>
          </FormSection>

          {/* Game & tournament */}
          <FormSection icon={Gamepad2} title="Game & Tournament">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Game" required>
                <Select value={form.game} onValueChange={(v) => set("game", v)}>
                  <SelectTrigger className="bg-black/40 border-gold/20 focus:border-gold/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d0d0d] border-gold/30">
                    <SelectItem value="MLBB">Mobile Legends: Bang Bang</SelectItem>
                    <SelectItem value="HOK">Honor of Kings</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tournament">
                <Select
                  value={form.tournamentId || "none"}
                  onValueChange={(v) =>
                    set("tournamentId", v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger className="bg-black/40 border-gold/20 focus:border-gold/60">
                    <SelectValue placeholder="Select a tournament (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d0d0d] border-gold/30">
                    <SelectItem value="none">— No tournament —</SelectItem>
                    {(tournaments || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FormSection>

          {/* Roster */}
          <FormSection icon={Users} title="Starting Roster (5 Players)">
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                ["player1", "player2", "player3", "player4", "player5"] as const
              ).map((key, i) => (
                <Field key={key} label={`Player ${i + 1} (IGN)`} required>
                  <Input
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={`In-game name ${i + 1}`}
                    className="bg-black/40 border-gold/20 focus:border-gold/60"
                  />
                </Field>
              ))}
              <Field label="Substitute (Optional)">
                <Input
                  value={form.substitute}
                  onChange={(e) => set("substitute", e.target.value)}
                  placeholder="Sub IGN"
                  className="bg-black/40 border-gold/20 focus:border-gold/60"
                />
              </Field>
            </div>
          </FormSection>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-gold/10">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="ns-btn-gold h-11 px-6 min-w-[180px]"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}
