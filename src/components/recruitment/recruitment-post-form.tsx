"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { createRecruitmentPost, updateRecruitmentPost, type ActionResult } from "@/app/recruitment/actions";
import { RECRUITMENT_GAMES, RECRUITMENT_ROLES, getRoleLabels } from "@/lib/validation/recruitment";
import type { RecruitmentPost, RecruitmentPostType } from "@/lib/types/database";

const GAME_LABELS: Record<string, string> = { MLBB: "Mobile Legends: Bang Bang", HOK: "Honor of Kings" };

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-10 px-5">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Saving..." : mode === "create" ? "Post" : "Save Changes"}
    </Button>
  );
}

export function RecruitmentPostForm({
  postType,
  open,
  onOpenChange,
  post,
}: {
  postType: RecruitmentPostType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: RecruitmentPost;
}) {
  const mode = post ? "edit" : "create";
  const action = mode === "create"
    ? createRecruitmentPost.bind(null, postType)
    : updateRecruitmentPost.bind(null, post!.id, postType);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  const [game, setGame] = useState(post?.game ?? "MLBB");
  const [role, setRole] = useState(post?.role ?? "ANY");

  useEffect(() => {
    if (state && "success" in state) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-gold/30 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            {mode === "create" ? (postType === "LFT" ? "Post — Looking For Team" : "Post — Looking For Player") : "Edit Post"}
          </DialogTitle>
          <DialogDescription>
            {postType === "LFT"
              ? "Let teams know you're available to recruit."
              : "Let players know your team is recruiting."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="game" value={game} />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="status" value={post?.status ?? "OPEN"} />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {postType === "LFT" ? "Title" : "Team"} <span className="text-gold">*</span>
            </Label>
            <Input
              name="title"
              required
              defaultValue={post?.title ?? ""}
              placeholder={postType === "LFT" ? "e.g. Experienced Roamer looking for a squad" : "e.g. NOBLE STRIKE Academy"}
              className="ns-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Game</Label>
              <Select value={game} onValueChange={(v) => setGame(v as "MLBB" | "HOK")}>
                <SelectTrigger className="ns-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-gold/30">
                  {RECRUITMENT_GAMES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GAME_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{postType === "LFT" ? "Preferred Role" : "Role Needed"}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger className="ns-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-gold/30">
                  {RECRUITMENT_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {getRoleLabels(game)[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {postType === "LFT" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Rank <span className="text-gold">*</span>
                </Label>
                <Input name="rank" required defaultValue={post?.rank ?? ""} placeholder="e.g. Mythic" className="ns-input" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Country <span className="text-gold">*</span>
                </Label>
                <Input name="country" required defaultValue={post?.country ?? ""} placeholder="e.g. Philippines" className="ns-input" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Requirements <span className="text-gold">*</span>
              </Label>
              <Textarea
                name="requirements"
                required
                defaultValue={post?.requirements ?? ""}
                placeholder="e.g. Mythic+ rank, available weeknights, mic required"
                className="ns-input min-h-16"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Telegram Username <span className="text-gold">*</span>
            </Label>
            <Input
              name="telegram_username"
              required
              defaultValue={post?.telegram_username ?? ""}
              placeholder="username"
              className="ns-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Description <span className="text-gold">*</span>
            </Label>
            <Textarea
              name="description"
              required
              defaultValue={post?.description ?? ""}
              placeholder="Tell them more..."
              className="ns-input min-h-24"
            />
          </div>

          {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end pt-2 border-t border-gold/10">
            <SubmitButton mode={mode} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
