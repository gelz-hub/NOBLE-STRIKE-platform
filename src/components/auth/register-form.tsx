"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, MailCheck } from "lucide-react";
import { signUpAction, type ActionResult } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold w-full h-11">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
      {pending ? "Creating account..." : "Create Account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signUpAction,
    null
  );

  if (state && "success" in state) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center">
          <MailCheck className="w-6 h-6 text-gold" />
        </div>
        <div className="space-y-1">
          <h1 className="font-display font-bold text-xl text-white">Check Your Email</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a confirmation link to your inbox. Verify your email to activate
            your account, then sign in.
          </p>
        </div>
        <Link href="/login">
          <Button className="ns-btn-outline mt-2">Back to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display font-bold text-xl text-white">Create Your Account</h1>
        <p className="text-sm text-muted-foreground">Join NOBLE STRIKE and enter the arena</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs text-muted-foreground">
            Username
          </Label>
          <Input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={24}
            placeholder="your_ign"
            className="ns-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="ns-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="ns-input"
          />
        </div>

        {state && "error" in state && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:text-gold-light font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
