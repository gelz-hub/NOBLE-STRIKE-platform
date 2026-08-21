"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { updateThemePreference, type ActionResult } from "@/app/settings/actions";
import type { ThemePreference } from "@/lib/types/database";

const OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType; description: string }[] = [
  { value: "dark", label: "Dark Mode", icon: Moon, description: "The original black & gold NOBLE STRIKE look." },
  { value: "light", label: "Light Mode", icon: Sun, description: "A lighter surface palette, same gold brand accents." },
  { value: "system", label: "System", icon: Monitor, description: "Follows your device's appearance setting." },
];

export function AppearanceSettingsForm({ initialTheme }: { initialTheme: ThemePreference }) {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState<ThemePreference>(initialTheme);
  const [, startTransition] = useTransition();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateThemePreference, null);

  useEffect(() => {
    setTheme(selected);
  }, [selected, setTheme]);

  function choose(value: ThemePreference) {
    setSelected(value);
    const formData = new FormData();
    formData.set("theme_preference", value);
    startTransition(() => formAction(formData));
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              className={cn(
                "ns-card rounded-xl p-5 text-left relative transition-colors",
                active && "border-gold/50"
              )}
            >
              {active && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold/20 border border-gold/50 flex items-center justify-center">
                  <Check className="w-3 h-3 text-gold-light" />
                </span>
              )}
              <Icon className="w-5 h-5 text-gold mb-3" />
              <p className="font-heading font-semibold text-sm text-text-primary">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
            </button>
          );
        })}
      </div>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <p className="text-xs text-muted-foreground">
        Applies immediately and syncs across your devices when signed in.
      </p>
    </div>
  );
}
