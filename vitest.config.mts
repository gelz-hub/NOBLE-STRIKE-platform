import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // See test/mocks/server-only.ts for why.
      "server-only": path.resolve(dirname, "./test/mocks/server-only.ts"),
      // See test/mocks/next-intl-server.ts for why.
      "next-intl/server": path.resolve(dirname, "./test/mocks/next-intl-server.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Coverage is scoped to business logic (bracket engine, notification
      // gating, validation schemas, workflow decision logic) per the 80%
      // target — not the whole Next.js app (pages/layouts/UI components
      // aren't "business logic" and pull the number down meaninglessly).
      include: [
        "src/lib/bracket/**",
        "src/lib/notifications.ts",
        "src/lib/validation/**",
      ],
      // queries.ts is a thin DB-read wrapper (calls createClient() from the
      // Next.js server context) — no branching logic worth unit testing,
      // and not mockable without pulling in Next's request-scoped cookies.
      exclude: ["src/lib/bracket/queries.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
