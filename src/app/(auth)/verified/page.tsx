"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

const AUTO_REDIRECT_SECONDS = 5;

export default function EmailVerifiedPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

  useEffect(() => {
    if (loading || !user) return;
    if (secondsLeft <= 0) {
      router.push("/dashboard");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [loading, user, secondsLeft, router]);

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="font-display font-bold text-2xl text-text-primary">✅ Email Verified</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account has been successfully verified.
          <br />
          You can now access all Noble Strike features.
        </p>
      </div>

      {!loading && user && (
        <p className="text-xs text-muted-foreground">
          Redirecting to your dashboard in {secondsLeft}s...
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link href="/dashboard">
          <Button className="ns-btn-gold h-11 px-6 w-full sm:w-auto">Go to Dashboard</Button>
        </Link>
        <Link href="/">
          <Button className="ns-btn-outline h-11 px-6 w-full sm:w-auto">Go to Home Page</Button>
        </Link>
      </div>
    </div>
  );
}
