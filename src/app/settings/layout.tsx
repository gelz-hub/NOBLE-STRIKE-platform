import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "@/components/settings/settings-nav";
import { NSLogo } from "@/components/ns/logo";
import { ArrowLeft } from "lucide-react";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings");

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 ns-grid-bg opacity-30 pointer-events-none fixed" />
      <header className="relative border-b border-gold/10">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <NSLogo size={32} />
            <span className="font-display font-extrabold text-sm tracking-[0.2em] text-gold-shine hidden sm:inline">
              NOBLE STRIKE
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 md:px-6 py-8">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary mb-6">
          Account Settings
        </h1>
        <SettingsNav />
        {children}
      </main>
    </div>
  );
}
