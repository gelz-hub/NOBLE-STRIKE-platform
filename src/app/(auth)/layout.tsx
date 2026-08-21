import Link from "next/link";
import { NSLogo } from "@/components/ns/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 ns-grid-bg opacity-40 pointer-events-none" />
      <div className="absolute inset-0 ns-radial-gold pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="transition-transform group-hover:scale-105 duration-500">
            <NSLogo size={48} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-extrabold text-lg tracking-[0.18em] text-gold-shine">
              NOBLE
            </span>
            <span className="font-display font-extrabold text-lg tracking-[0.32em] text-gold-shine -mt-0.5">
              STRIKE
            </span>
          </div>
        </Link>

        <div className="ns-card ns-card-gold-edge rounded-2xl p-6 sm:p-8">{children}</div>

        <p className="mt-6 text-center text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          Compete. Conquer. Become Legendary.
        </p>
      </div>
    </div>
  );
}
