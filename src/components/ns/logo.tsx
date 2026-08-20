"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  textClassName?: string;
}

export function NSLogo({ size = 40, className, withText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/ns-logo.svg"
        alt="NOBLE STRIKE"
        width={size}
        height={size}
        className="shrink-0 drop-shadow-[0_0_12px_rgba(213,190,119,0.4)]"
        style={{ width: size, height: size }}
      />
      {withText && (
        <div className="flex flex-col leading-none">
          <span
            className="text-gold-shine font-display font-extrabold tracking-[0.18em]"
            style={{ fontSize: size * 0.42 }}
          >
            NOBLE
          </span>
          <span
            className="text-gold-shine font-display font-extrabold tracking-[0.32em] -mt-0.5"
            style={{ fontSize: size * 0.42 }}
          >
            STRIKE
          </span>
        </div>
      )}
    </div>
  );
}

/** Compact stacked wordmark used in footer / hero */
export function NSWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className="text-gold-shine font-display font-black tracking-[0.2em]">NOBLE</span>
      <span className="text-gold-shine font-display font-black tracking-[0.36em] -mt-1">STRIKE</span>
    </div>
  );
}
