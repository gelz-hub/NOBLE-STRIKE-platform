import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyErrorPage() {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="font-display font-bold text-2xl text-text-primary">Verification Failed</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This verification link is invalid or has expired.
          <br />
          Please request a new one to continue.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link href="/login">
          <Button className="ns-btn-gold h-11 px-6 w-full sm:w-auto">Go to Login</Button>
        </Link>
        <Link href="/">
          <Button className="ns-btn-outline h-11 px-6 w-full sm:w-auto">Go to Home Page</Button>
        </Link>
      </div>
    </div>
  );
}
