import Link from "next/link";
import Image from "next/image";
import { StatusPill } from "@/components/ns/ui";
import { TournamentActionsMenu } from "./tournament-actions-menu";
import { Network, PenSquare, Users } from "lucide-react";
import { GAME_LABELS } from "@/lib/types";

interface TournamentRowProps {
  id: string;
  title: string;
  bannerUrl: string | null;
  gameType: string;
  status: string;
  maxTeams: number;
  approvedCount: number;
  startDate: string;
}

export function TournamentRow({
  id,
  title,
  bannerUrl,
  gameType,
  status,
  maxTeams,
  approvedCount,
  startDate,
}: TournamentRowProps) {
  return (
    <div className="ns-card rounded-lg p-3 flex items-center gap-3">
      <div className="relative w-16 h-10 rounded-md overflow-hidden bg-black/40 border border-gold/15 shrink-0">
        {bannerUrl ? (
          <Image src={bannerUrl} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-black" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {GAME_LABELS[gameType] || gameType} · {new Date(startDate).toLocaleDateString()}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 shrink-0">
        <Users className="w-3.5 h-3.5 text-gold/60" />
        {approvedCount} / {maxTeams}
      </div>

      <StatusPill status={status} />

      <Link
        href={`/admin/tournaments/${id}/bracket`}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-gold/20 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light hover:border-gold/40 transition-colors shrink-0"
      >
        <Network className="w-3.5 h-3.5" />
        Bracket
      </Link>

      <Link
        href={`/admin/tournaments/${id}/edit`}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-gold/20 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light hover:border-gold/40 transition-colors shrink-0"
      >
        <PenSquare className="w-3.5 h-3.5" />
        Edit
      </Link>

      <TournamentActionsMenu tournamentId={id} title={title} />
    </div>
  );
}
