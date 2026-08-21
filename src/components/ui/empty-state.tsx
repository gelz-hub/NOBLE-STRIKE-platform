import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** The empty-state pattern already used ad hoc (news grid, player search,
 *  team lists) with a hardcoded icon/text combo, promoted to a shared
 *  primitive using semantic tokens. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3", className)}>
      <Icon className="w-8 h-8 text-gold/50" />
      <p className="text-text-primary/80">{title}</p>
      {description && <p className="text-sm text-text-secondary max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
