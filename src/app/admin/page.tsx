import { redirect } from "next/navigation";

// No content of its own — redirects to the first admin section. The role
// gate itself lives in admin/layout.tsx (runs before this), so this only
// ever executes for a confirmed admin.
export default function AdminIndexPage() {
  redirect("/admin/tournaments");
}
