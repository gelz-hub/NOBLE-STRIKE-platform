import Link from "next/link";
import { TeamMonogram } from "@/components/ns/ui";
import { Users, Trophy, PenSquare, ExternalLink } from "lucide-react";

interface TeamCardProps {
  id: string;
  teamName: string;
  logoUrl: string | null;
  memberCount: number;
  registrationCount: number;
}

export function TeamCard({ id, teamName, logoUrl, memberCount, registrationCount }: TeamCardProps) {
  return (
    <div className="ns-card ns-card-gold-edge rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <TeamMonogram name={teamName} logo={logoUrl} size={52} />
        <div className="min-w-0">
          <h3 className="font-heading font-bold text-white truncate">{teamName}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {memberCount} Players
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {registrationCount} Registrations
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gold/10">
        <Link
          href={`/dashboard/teams/${id}/edit`}
          className="ns-btn-outline flex-1 h-9 rounded-md flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider"
        >
          <PenSquare className="w-3.5 h-3.5" />
          Edit
        </Link>
        <Link
          href={`/teams/${id}`}
          className="flex items-center justify-center w-9 h-9 rounded-md border border-gold/20 text-white/60 hover:text-gold-light hover:border-gold/40 transition-colors"
          aria-label="View team page"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
