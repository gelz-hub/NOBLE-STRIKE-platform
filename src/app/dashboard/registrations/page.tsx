import Link from "next/link";
import { StatusPill } from "@/components/ns/ui";
import { WithdrawRegistrationButton } from "@/components/dashboard/withdraw-registration-button";
import { Trophy } from "lucide-react";
import { getMyRegistrations } from "./actions";

export default async function MyRegistrationsPage() {
  const registrations = await getMyRegistrations();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Tournament Registrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track every registration your teams have submitted.
        </p>
      </div>

      {registrations.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Trophy className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">No registrations yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {registrations.map((r) => (
            <div key={r.id} className="ns-card rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {r.tournaments?.title ?? "Tournament"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.teams?.team_name} · Submitted{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.reviewed_at &&
                    ` · Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}`}
                </p>
                {r.status === "REJECTED" && r.rejection_reason && (
                  <p className="text-xs text-red-400 mt-1">Reason: {r.rejection_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill status={r.status} />
                {r.status === "PENDING" && <WithdrawRegistrationButton registrationId={r.id} />}
                {r.teams?.id && (
                  <Link
                    href={`/teams/${r.teams.id}`}
                    className="text-xs text-gold hover:text-gold-light uppercase tracking-wider"
                  >
                    View Team
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
