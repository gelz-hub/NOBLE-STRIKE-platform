import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}

/** The stat-card pattern already used ad hoc across team/tournament/profile
 *  pages, promoted to a shared primitive so it doesn't get re-implemented
 *  per page with slightly different (and sometimes hardcoded) classes. */
export function StatCard({ icon: Icon, label, value, className }: StatCardProps) {
  return (
    <div className={cn("ns-card rounded-xl p-4 text-center", className)}>
      <Icon className="w-4 h-4 text-gold mx-auto mb-2" />
      <div className="font-display font-extrabold text-xl text-text-primary">{value}</div>
      <div className="text-[0.65rem] text-text-secondary uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
