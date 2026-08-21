"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ns/ui";
import { Check, Loader2, X } from "lucide-react";
import { resolveDispute } from "@/app/admin/matches/actions";
import type { MatchDispute } from "@/lib/types/database";

export function DisputeResolvePanel({ disputes }: { disputes: MatchDispute[] }) {
  if (disputes.length === 0) return null;

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <DisputeCard key={d.id} dispute={d} />
      ))}
    </div>
  );
}

function DisputeCard({ dispute }: { dispute: MatchDispute }) {
  const [response, setResponse] = useState(dispute.admin_response ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isPending = dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";

  function handle(status: "RESOLVED" | "REJECTED") {
    if (!response.trim()) {
      toast.error("Please explain the resolution.");
      return;
    }
    startTransition(async () => {
      const result = await resolveDispute(dispute.id, status, response);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Dispute ${status.toLowerCase()}.`);
      router.refresh();
    });
  }

  return (
    <div className="ns-card rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Opened {new Date(dispute.created_at).toLocaleString()}
        </p>
        <StatusPill status={dispute.status} />
      </div>
      <p className="text-sm text-white/90">{dispute.explanation}</p>

      {dispute.evidence_urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dispute.evidence_urls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-20 h-20 rounded-md overflow-hidden border border-gold/20 hover:border-gold/50"
            >
              <Image src={url} alt="Dispute evidence" fill sizes="80px" className="object-cover" />
            </a>
          ))}
        </div>
      )}

      {isPending ? (
        <div className="space-y-2 pt-2 border-t border-gold/10">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Explain the resolution..."
            className="ns-input text-sm min-h-16"
          />
          <div className="flex justify-end gap-2">
            <Button
              disabled={pending}
              variant="ghost"
              onClick={() => handle("REJECTED")}
              className="h-9 px-4 text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 border border-destructive/30"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Reject
            </Button>
            <Button
              disabled={pending}
              onClick={() => handle("RESOLVED")}
              className="ns-btn-gold h-9 px-4 text-xs uppercase tracking-wider"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Resolve
            </Button>
          </div>
        </div>
      ) : (
        dispute.admin_response && (
          <div className="pt-2 border-t border-gold/10">
            <p className="text-xs text-muted-foreground">Admin response:</p>
            <p className="text-sm text-white/80">{dispute.admin_response}</p>
          </div>
        )
      )}
    </div>
  );
}
