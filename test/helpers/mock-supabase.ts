import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;
type Table = Row[];
type Store = Record<string, Table>;

/**
 * A minimal in-memory stand-in for a Supabase client, supporting exactly
 * the query shapes used across this codebase's Server Actions/lib code:
 * .select().eq().eq().single(), .insert().select().single(), .update().eq(),
 * .delete().eq(). Not a general PostgREST emulator — just enough to run the
 * real bracket-generation / notification-gating code against fake tables
 * without touching a real database, so "unit test the algorithm" doesn't
 * require "spin up Postgres."
 *
 * Chain methods return `this` and the object is thenable, so both
 * `await q.eq(...).single()` and plain `await q.eq(...)` (no `.single()`,
 * used by list-returning queries) work exactly like the real client.
 */
export function createMockSupabase(
  seed: Store = {},
  options: { authUserId?: string | null } = {}
) {
  const store: Store = {};
  for (const [table, rows] of Object.entries(seed)) {
    store[table] = rows.map((r) => ({ ...r }));
  }

  function from(table: string) {
    if (!store[table]) store[table] = [];
    const filters: [string, unknown][] = [];
    let mode: "select" | "insert" | "update" | "delete" = "select";
    let insertRows: Row[] | null = null;
    let updatePatch: Row | null = null;
    let wantCount = false;

    function applyFilters(rows: Table): Table {
      return rows.filter((r) => filters.every(([col, val]) => r[col] === val));
    }

    function execute(single: boolean): { data: unknown; error: null; count?: number } {
      if (mode === "insert" && insertRows) {
        const inserted = insertRows.map((r) => ({ id: randomUUID(), ...r }));
        store[table].push(...inserted);
        return { data: single ? inserted[0] : inserted, error: null };
      }
      if (mode === "update" && updatePatch) {
        const matched = applyFilters(store[table]);
        for (const row of matched) Object.assign(row, updatePatch);
        return { data: single ? (matched[0] ?? null) : matched, error: null };
      }
      if (mode === "delete") {
        const matched = new Set(applyFilters(store[table]));
        store[table] = store[table].filter((r) => !matched.has(r));
        return { data: null, error: null };
      }
      const matched = applyFilters(store[table]);
      const result: { data: unknown; error: null; count?: number } = {
        data: single ? (matched[0] ?? null) : matched,
        error: null,
      };
      if (wantCount) result.count = matched.length;
      return result;
    }

    const builder = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (opts?.count) wantCount = true;
        return builder;
      },
      insert(rows: Row | Row[]) {
        mode = "insert";
        insertRows = Array.isArray(rows) ? rows : [rows];
        return builder;
      },
      update(patch: Row) {
        mode = "update";
        updatePatch = patch;
        return builder;
      },
      delete() {
        mode = "delete";
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      order() {
        return builder;
      },
      single() {
        return Promise.resolve(execute(true));
      },
      maybeSingle() {
        return Promise.resolve(execute(true));
      },
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        return Promise.resolve(execute(false)).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    from,
    auth: {
      async getUser() {
        return {
          data: { user: options.authUserId ? { id: options.authUserId } : null },
        };
      },
    },
    /** Direct access to the underlying tables, for assertions in tests. */
    _tables: store,
  };
}
