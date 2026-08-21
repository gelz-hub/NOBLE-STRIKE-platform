import { TeamIdentityForm } from "@/components/dashboard/team-identity-form";
import { createTeam } from "../actions";

export default function NewTeamPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="ns-kicker mb-2">Step 1 of 2</p>
        <h1 className="font-display font-bold text-2xl text-white">Create Your Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your team identity. You&apos;ll build your roster next.
        </p>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <TeamIdentityForm action={createTeam} submitLabel="Continue to Roster" mode="create" />
      </div>
    </div>
  );
}
