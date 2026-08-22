"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { MarkdownContent } from "@/components/news/markdown-content";
import { Loader2, Newspaper, Save } from "lucide-react";
import { NEWS_CATEGORIES, NEWS_STATUSES, slugifyTitle } from "@/lib/validation/news";
import { toDatetimeLocal } from "@/lib/format-datetime";
import type { ActionResult } from "@/app/admin/news/actions";
import type { News } from "@/lib/types/database";

interface NewsFormProps {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  initial?: Partial<News>;
  mode: "create" | "edit";
  tournaments: { id: string; title: string }[];
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("admin.news");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? t("saving") : mode === "create" ? t("createArticle") : t("saveChanges")}
    </Button>
  );
}

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
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}

export function NewsForm({ action, initial, mode, tournaments }: NewsFormProps) {
  const t = useTranslations("admin.news");
  const tCategory = useTranslations("news.category");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const [title, setTitle] = useState(initial?.title_en ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "ANNOUNCEMENT");
  const [status, setStatus] = useState<string>(initial?.status ?? "DRAFT");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [tournamentId, setTournamentId] = useState(initial?.tournament_id ?? "none");
  const [contentEn, setContentEn] = useState(initial?.content_en ?? "");

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="image_url" value={imageUrl} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="featured" value={featured ? "true" : "false"} />
      <input type="hidden" name="pinned" value={pinned ? "true" : "false"} />
      <input type="hidden" name="tournament_id" value={tournamentId === "none" ? "" : tournamentId} />

      <FormSection icon={Newspaper} title={t("basicInformation")}>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("title")} <span className="text-gold">*</span>
          </Label>
          <LocaleTabs
            en={
              <Input
                name="title_en"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugifyTitle(e.target.value));
                }}
                placeholder={t("titlePlaceholder")}
                className="ns-input"
              />
            }
            km={
              <Input
                name="title_km"
                defaultValue={initial?.title_km ?? ""}
                dir="auto"
                className="ns-input"
              />
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("slug")} <span className="text-gold">*</span>
          </Label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugifyTitle(e.target.value));
            }}
            className="ns-input font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("excerpt")}</Label>
          <LocaleTabs
            en={
              <Textarea
                name="excerpt_en"
                defaultValue={initial?.excerpt_en ?? ""}
                maxLength={300}
                placeholder={t("excerptPlaceholder")}
                className="ns-input min-h-16"
              />
            }
            km={
              <Textarea
                name="excerpt_km"
                defaultValue={initial?.excerpt_km ?? ""}
                maxLength={300}
                dir="auto"
                className="ns-input min-h-16"
              />
            }
          />
        </div>
        <ImageUpload useCase="newsImage" label={t("bannerImage")} shape="wide" size={360} currentUrl={imageUrl} onUploaded={setImageUrl} />
      </FormSection>

      <FormSection icon={Newspaper} title={t("content")}>
        <LocaleTabs
          en={
            <Tabs defaultValue="write">
              <TabsList className="bg-black/40 border border-gold/15">
                <TabsTrigger value="write">{t("write")}</TabsTrigger>
                <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
              </TabsList>
              <TabsContent value="write" className="pt-3">
                <Textarea
                  name="content_en"
                  required
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  placeholder={t("contentPlaceholder")}
                  className="ns-input min-h-96 font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview" className="pt-3">
                <div className="ns-card rounded-lg p-6 min-h-96">
                  {contentEn ? <MarkdownContent content={contentEn} /> : <p className="text-muted-foreground text-sm">{t("nothingToPreview")}</p>}
                </div>
              </TabsContent>
            </Tabs>
          }
          km={
            <Textarea
              name="content_km"
              defaultValue={initial?.content_km ?? ""}
              dir="auto"
              placeholder={t("contentPlaceholder")}
              className="ns-input min-h-96 font-mono text-sm"
            />
          }
        />
      </FormSection>

      <FormSection icon={Newspaper} title={t("classification")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("category")} <span className="text-gold">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {NEWS_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {tCategory(c.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("relatedTournament")}</Label>
            <Select value={tournamentId ?? "none"} onValueChange={setTournamentId}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                <SelectItem value="none">{t("none")}</SelectItem>
                {tournaments.map((tItem) => (
                  <SelectItem key={tItem.id} value={tItem.id}>
                    {tItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-8">
          <div className="flex items-center gap-3">
            <Switch checked={pinned} onCheckedChange={setPinned} />
            <span className="text-sm text-white/80">{t("pinned")}</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={featured} onCheckedChange={setFeatured} />
            <span className="text-sm text-white/80">{t("featured")}</span>
          </div>
        </div>
      </FormSection>

      <FormSection icon={Newspaper} title={t("publishing")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {NEWS_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`statusOption.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("publishDate")}</Label>
            <Input type="datetime-local" name="publish_at" defaultValue={toDatetimeLocal(initial?.publish_at)} className="ns-input" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("publishHint")}</p>
      </FormSection>

      <FormSection icon={Newspaper} title={t("seo")}>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("seoDescription")}</Label>
          <Textarea
            name="seo_description"
            defaultValue={initial?.seo_description ?? ""}
            maxLength={300}
            className="ns-input min-h-16"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("seoKeywords")}</Label>
          <Input
            name="seo_keywords"
            defaultValue={initial?.seo_keywords?.join(", ") ?? ""}
            placeholder="esports, mlbb, tournament"
            className="ns-input"
          />
        </div>
      </FormSection>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-400">{t("saved")}</p>}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
