"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Save, ShieldCheck } from "lucide-react";
import { updateEmail, updatePassword, type ActionResult } from "@/app/settings/actions";

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-text-primary">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-10 px-5">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function AccountSettingsForm({ currentEmail }: { currentEmail: string }) {
  const [emailState, emailAction] = useActionState<ActionResult | null, FormData>(updateEmail, null);
  const [passwordState, passwordAction] = useActionState<ActionResult | null, FormData>(updatePassword, null);

  return (
    <div className="space-y-10">
      <form action={emailAction} className="space-y-4">
        <FormSection icon={Mail} title="Email Address">
          <div className="space-y-1.5 max-w-sm">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              name="email"
              type="email"
              required
              defaultValue={currentEmail}
              className="ns-input"
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Changing your email sends a confirmation link to the new address before it takes effect.
            </p>
          </div>
          {emailState && "error" in emailState && <p className="text-sm text-destructive">{emailState.error}</p>}
          {emailState && "success" in emailState && (
            <p className="text-sm text-emerald-400">Check your new inbox to confirm the change.</p>
          )}
          <SubmitButton label="Update Email" />
        </FormSection>
      </form>

      <form action={passwordAction} className="space-y-4 pt-8 border-t border-gold/10">
        <FormSection icon={ShieldCheck} title="Password">
          <div className="space-y-1.5 max-w-sm">
            <Label className="text-xs text-muted-foreground">New Password</Label>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="ns-input"
            />
          </div>
          {passwordState && "error" in passwordState && (
            <p className="text-sm text-destructive">{passwordState.error}</p>
          )}
          {passwordState && "success" in passwordState && (
            <p className="text-sm text-emerald-400">Password updated.</p>
          )}
          <SubmitButton label="Update Password" />
        </FormSection>
      </form>
    </div>
  );
}
