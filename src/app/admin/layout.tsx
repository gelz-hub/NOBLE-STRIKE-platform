import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NSLogo } from "@/components/ns/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { ArrowLeft, Shield } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 ns-grid-bg opacity-30 pointer-events-none fixed" />
      <header className="relative border-b border-gold/10">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <NSLogo size={32} />
            <span className="font-display font-extrabold text-sm tracking-[0.2em] text-gold-shine hidden sm:inline">
              NOBLE STRIKE
            </span>
            <span className="flex items-center gap-1 text-[0.65rem] uppercase tracking-widest text-gold border border-gold/30 rounded-full px-2 py-0.5">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Site
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 md:px-6 py-8">
        <AdminNav />
        {children}
      </main>
    </div>
  );
}
