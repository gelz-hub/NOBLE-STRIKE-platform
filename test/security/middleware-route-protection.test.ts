import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// updateSession uses @supabase/ssr's createServerClient directly (not the
// @/lib/supabase/server wrapper), so that's what needs mocking here — this
// lets the test exercise the actual middleware redirect logic in
// src/lib/supabase/middleware.ts, not a re-implementation of it.
let authUser: { id: string } | null = null;
let profileRole: "user" | "admin" | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      async getUser() {
        return { data: { user: authUser } };
      },
    },
    from(_table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async single() {
          return { data: profileRole ? { role: profileRole } : null };
        },
      };
    },
  }),
}));

const { updateSession } = await import("@/lib/supabase/middleware");

function requestFor(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("Middleware route protection", () => {
  beforeEach(() => {
    authUser = null;
    profileRole = null;
  });

  it("redirects an unauthenticated visitor away from /admin/* to /login", async () => {
    const res = await updateSession(requestFor("/admin/tournaments"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/login");
  });

  it("redirects an unauthenticated visitor away from /dashboard/* to /login", async () => {
    const res = await updateSession(requestFor("/dashboard/teams"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("redirects an unauthenticated visitor away from /settings/* to /login", async () => {
    const res = await updateSession(requestFor("/settings/profile"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("redirects an authenticated non-admin away from /admin/* to /dashboard", async () => {
    authUser = { id: "user-1" };
    profileRole = "user";
    const res = await updateSession(requestFor("/admin/tournaments"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("lets an authenticated admin through to /admin/*", async () => {
    authUser = { id: "admin-1" };
    profileRole = "admin";
    const res = await updateSession(requestFor("/admin/tournaments"));
    // NextResponse.next() carries no redirect — a 200-shaped pass-through.
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets an authenticated non-admin through to /dashboard/*", async () => {
    authUser = { id: "user-1" };
    profileRole = "user";
    const res = await updateSession(requestFor("/dashboard/teams"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not gate public routes at all", async () => {
    const res = await updateSession(requestFor("/news"));
    expect(res.headers.get("location")).toBeNull();
  });
});
