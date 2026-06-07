/**
 * Compatibility shim that preserves the historical Supabase client
 * query-builder API surface (`.from().select()...`) for the legacy
 * public-storefront and admin pages that still call into it. The SaaS
 * rebuild no longer uses Supabase as a backend — server actions and
 * API routes connect directly to Postgres via `pg` / `withDb` from
 * `@/db/client`. This shim exists so the build keeps passing while
 * the remaining legacy call sites are migrated to Drizzle / raw `pg`
 * queries.
 *
 * IMPORTANT: This shim does NOT talk to a real database. It returns
 * empty result sets. Legacy call sites that need real data must be
 * rewritten against `pool` / `withDb` / `withTenant`.
 *
 * The query-builder API surface supported here is intentionally narrow:
 *   - .from(table).select(cols?).eq(col, val).eq(...).is(col, null).
 *     order(col, opts?).limit(n).range(min, max).single() → returns
 *     `{ data, error }` like the Supabase client did.
 *   - .from(table).insert(payload).select().single() for legacy inserts
 *   - .from(table).upsert(payload)
 *   - .from(table).update(payload).eq(col, val)
 *   - .from(table).delete().eq(col, val)
 *   - .rpc(fnName, params) — returns `{ data, error }` (data is null)
 *   - .auth.{getSession, getUser, signInWithPassword, signOut,
 *     updateUser, onAuthStateChange} — all return null / no-ops
 *   - .storage.from(bucket).{upload, download, remove, list}
 *   - .channel().on().subscribe()
 *
 * If a call site needs more than that, migrate the call site.
 */

import { getMockTableData } from "./mock-data";

const useMockData =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || true;

type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "is" | "like" | "ilike" | "in";
type Filter = { column: string; value: unknown; op: FilterOp };

class MockQueryBuilder {
  private data: unknown[];
  private tableName: string;
  private filters: Filter[] = [];
  private selectColumns: string = "*";
  private orderColumn?: string;
  private orderDirection?: "asc" | "desc";
  private limitValue?: number;
  private rangeMin?: number;
  private rangeMax?: number;
  private mode: "select" | "update" | "delete" = "select";
  private mutationData: Record<string, unknown> | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.data = [...(getMockTableData(tableName) || [])];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(columns: string = "*", _opts?: any) {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value, op: "eq" });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, value, op: "neq" });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, value, op: "gt" });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, value, op: "gte" });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, value, op: "lt" });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, value, op: "lte" });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, value, op: "is" });
    return this;
  }

  like(column: string, value: string) {
    this.filters.push({ column, value, op: "like" });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, value, op: "ilike" });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, value: values, op: "in" });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderColumn = column;
    this.orderDirection = options?.ascending === false ? "desc" : "asc";
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  range(min: number, max: number) {
    this.rangeMin = min;
    this.rangeMax = max;
    return this;
  }

  // The legacy Supabase client returns a thenable from .single() so
  // callers can write `.single().then(({ data, error }) => ...)` as
  // well as `const { data, error } = await ....single()`. We return a
  // proper Promise<{ data: any, error: any }> so destructured binding
  // patterns in callers work under `--strict` (no implicit `any`).
  single() {
    return Promise.resolve(this.executeSingle());
  }

  maybeSingle() {
    return Promise.resolve(this.executeSingle());
  }

  // Return a generic `any` to match the historical Supabase client
  // typing (`data: T[]`, `data: T` for `.single()`). Without this, every
  // consumer would have to be rewritten just to satisfy the type
  // checker, which defeats the purpose of the shim.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<TResult1 = any, TResult2 = never>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = this.execute();
    return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as TResult1));
  }

  // Insert / update / delete mutators — these are mostly used by legacy
  // auth flows and the AI preferences action. We capture the data and
  // short-circuit to a successful no-op response so the call sites
  // don't blow up. Real writes must go through server actions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeSingle(): any {
    const result = this.execute();
    if (Array.isArray(result.data) && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(): any {
    if (this.mode === "update" || this.mode === "delete") {
      return this.runMutation();
    }
    let filtered: unknown[] = [...this.data];

    for (const filter of this.filters) {
      filtered = filtered.filter((row: any) => {
        const rowValue = row[filter.column];
        switch (filter.op) {
          case "eq":
            return rowValue === filter.value;
          case "neq":
            return rowValue !== filter.value;
          case "gt":
            return (rowValue as number) > (filter.value as number);
          case "gte":
            return (rowValue as number) >= (filter.value as number);
          case "lt":
            return (rowValue as number) < (filter.value as number);
          case "lte":
            return (rowValue as number) <= (filter.value as number);
          case "is":
            if (filter.value === null) return rowValue === null;
            if (filter.value === undefined) return rowValue === undefined;
            return rowValue === filter.value;
          case "like":
            return (
              typeof rowValue === "string" &&
              rowValue.includes((filter.value as string).replace(/%/g, ""))
            );
          case "ilike":
            return (
              typeof rowValue === "string" &&
              rowValue
                .toLowerCase()
                .includes((filter.value as string).replace(/%/g, "").toLowerCase())
            );
          case "in":
            return Array.isArray(filter.value) && filter.value.includes(rowValue);
          default:
            return true;
        }
      });
    }

    if (this.orderColumn) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filtered.sort((a: any, b: any) => {
        const aVal = a[this.orderColumn!];
        const bVal = b[this.orderColumn!];
        if (aVal < bVal) return this.orderDirection === "desc" ? 1 : -1;
        if (aVal > bVal) return this.orderDirection === "desc" ? -1 : 1;
        return 0;
      });
    }

    if (this.rangeMin !== undefined && this.rangeMax !== undefined) {
      filtered = filtered.slice(this.rangeMin, this.rangeMax + 1);
    } else if (this.limitValue !== undefined) {
      filtered = filtered.slice(0, this.limitValue);
    }

    return { data: filtered, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private runMutation(): any {
    if (this.mode === "delete") {
      return { data: null, error: null };
    }
    if (this.mutationData) {
      const items = [this.mutationData];
      const returning = items.map((item, i) => ({
        ...item,
        id: (item as Record<string, unknown>).id ?? `generated-${Date.now()}-${i}`,
      }));
      return { data: returning, error: null };
    }
    return { data: null, error: null };
  }
}

class MockMutationBuilder {
  private tableName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private data: any;

  constructor(tableName: string, data: unknown) {
    this.tableName = tableName;
    this.data = data;
  }

  select() {
    return new MockQueryBuilder(this.tableName);
  }

  eq() {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<TResult1 = any, TResult2 = never>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      data: Array.isArray(this.data)
        ? this.data.map((item: any, i: number) => ({
            ...item,
            id: item?.id ?? `generated-${Date.now()}-${i}`,
          }))
        : this.data
          ? [{ ...this.data, id: this.data.id ?? `generated-${Date.now()}` }]
          : null,
      error: null,
    };
    return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as TResult1));
  }
}

class MockDeleteBuilder {
  eq(_column: string, _value: unknown) {
    return this;
  }
  in(_column: string, _values: unknown[]) {
    return this;
  }
  then(resolve: (value: unknown) => void) {
    resolve({ data: null, error: null });
  }
}

class MockStorageBuilder {
  from(_bucket: string) {
    return {
      upload: async (_path: string, _file: unknown) => ({ data: { path: _path }, error: null }),
      download: async (_path: string) => ({ data: new Blob(), error: null }),
      remove: async (_paths: string[]) => ({ data: { paths: _paths }, error: null }),
      list: async () => ({ data: [], error: null }),
    };
  }
}

function createMockClient() {
  // The query builder is mutable, so we can't simply return a class
  // instance + spread mutation methods. The cleanest way to support
  // both `.from(t).select(...)...` (read) and `.from(t).update(d).eq(...)`
  // (write) in a single chain is to delegate everything to one object
  // and inspect `this.mode` lazily. We build that object via
  // `Object.assign` to keep the TypeScript inference happy.
  function makeFrom(table: string) {
    const qb = new MockQueryBuilder(table);
    return Object.assign(qb, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insert: (data: any) => new MockMutationBuilder(table, data),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: (data: any) => new MockMutationBuilder(table, data),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upsert: (data: any) => new MockMutationBuilder(table, data),
      delete: () => new MockDeleteBuilder(),
    });
  }

  return {
    from: makeFrom,
    storage: new MockStorageBuilder(),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signInWithPassword: async (_creds: any) => ({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateUser: async (_attrs: any): Promise<any> => ({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: async (_name: string, _params?: any): Promise<any> => ({
      data: null,
      error: null,
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
    }),
  };
}

export const supabase = useMockData ? createMockClient() : createMockClient();

export { useMockData };
