import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamRosterForm } from "@/components/dashboard/team-roster-form";
import type { TeamMember } from "@/lib/types/database";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default async function TeamRosterPage({ params }: Props) {
  const { teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/teams/${teamId}/roster`);

  const { data: team } = await supabase.from("teams").select("id, team_name, owner_id").eq("id", teamId).single();
  if (!team) notFound();
  if (team.owner_id !== user.id) redirect("/dashboard/teams");

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="ns-kicker mb-2">Step 2 of 2</p>
        <h1 className="font-display font-bold text-2xl text-white">
          Build {team.team_name}&apos;s Roster
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill the 5 starting roles, then optionally add substitutes and a coach.
        </p>
      </div>

      <TeamRosterForm teamId={teamId} initialMembers={(members ?? []) as TeamMember[]} />
    </div>
  );
}
