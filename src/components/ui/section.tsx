import { cn } from "@/lib/utils";

interface SectionProps extends React.ComponentProps<"section"> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

/** A titled content section — semantic-token driven, usable in any page. */
export function Section({ title, description, actions, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <div>
              <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-text-primary">
                {title}
              </h2>
              {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
            </div>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
