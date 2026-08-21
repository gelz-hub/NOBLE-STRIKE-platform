import Link from "next/link";
import { TeamMonogram } from "@/components/ns/ui";
import { Shield } from "lucide-react";
import type { Profile } from "@/lib/types/database";

export function PlayerCard({ profile }: { profile: Profile }) {
  return (
    <Link href={`/users/${profile.username}`} className="ns-card rounded-xl p-4 flex items-center gap-3">
      <TeamMonogram name={profile.display_name || profile.username || "?"} logo={profile.avatar_url} size={48} />
      <div className="min-w-0">
        <p className="font-medium text-text-primary truncate flex items-center gap-1.5">
          {profile.display_name || profile.username}
          {profile.role === "admin" && <Shield className="w-3.5 h-3.5 text-gold shrink-0" />}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          @{profile.username}
          {profile.country ? ` · ${profile.country}` : ""}
        </p>
      </div>
    </Link>
  );
}
