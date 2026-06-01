import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMockTableData } from "./mock-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Auto-enable mock mode when no Supabase URL is configured (demo/deployment without backend)
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !supabaseUrl || !supabaseUrl.includes("supabase.co");

// Mock query builder that supports all common Supabase methods
class MockQueryBuilder {
  private data: unknown[];
  private tableName: string;
  private filters: { column: string; value: unknown; op: string }[] = [];
  private selectColumns: string = "*";
  private orderColumn?: string;
  private orderDirection?: "asc" | "desc";
  private limitValue?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.data = [...(getMockTableData(tableName) || [])];
  }

  select(columns: string = "*") {
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
    // For pagination mock
    return this;
  }

  single() {
    return this.executeSingle();
  }

  then(resolve: (value: unknown) => void, _reject?: (reason?: unknown) => void) {
    const result = this.execute();
    resolve(result);
  }

  async executeSingle() {
    const result = this.execute();
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: null };
  }

  execute() {
    let filtered = [...this.data];

    // Apply filters
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
            return typeof rowValue === "string" && rowValue.includes((filter.value as string).replace(/%/g, ""));
          case "ilike":
            return typeof rowValue === "string" && rowValue.toLowerCase().includes((filter.value as string).replace(/%/g, "").toLowerCase());
          case "in":
            return Array.isArray(filter.value) && filter.value.includes(rowValue);
          default:
            return true;
        }
      });
    }

    // Apply ordering
    if (this.orderColumn) {
      filtered.sort((a: any, b: any) => {
        const aVal = a[this.orderColumn!];
        const bVal = b[this.orderColumn!];
        if (aVal < bVal) return this.orderDirection === "desc" ? 1 : -1;
        if (aVal > bVal) return this.orderDirection === "desc" ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitValue !== undefined) {
      filtered = filtered.slice(0, this.limitValue);
    }

    return { data: filtered, error: null };
  }
}

// Mock insert/update/delete builders
class MockMutationBuilder {
  private tableName: string;
  private data: Record<string, unknown> | Record<string, unknown>[];

  constructor(tableName: string, data: Record<string, unknown> | Record<string, unknown>[]) {
    this.tableName = tableName;
    this.data = data;
  }

  select() {
    return new MockQueryBuilder(this.tableName);
  }

  then(resolve: (value: unknown) => void) {
    const items = Array.isArray(this.data) ? this.data : [this.data];
    const returning = items.map((item, i) => ({
      ...item,
      id: item.id || `generated-${Date.now()}-${i}`,
    }));
    resolve({ data: returning, error: null });
  }
}

// Mock storage builder
class MockStorageBuilder {
  from(bucket: string) {
    return {
      upload: async (path: string, _file: unknown) => {
        return { data: { path }, error: null };
      },
      download: async (path: string) => {
        return { data: new Blob(), error: null };
      },
      remove: async (paths: string[]) => {
        return { data: { paths }, error: null };
      },
      list: async () => {
        return { data: [], error: null };
      },
    };
  }
}

// Create mock client
function createMockClient() {
  return {
    from: (table: string) => new MockQueryBuilder(table),
    insert: (data: Record<string, unknown> | Record<string, unknown>[]) => new MockMutationBuilder("unknown", data),
    update: (data: Record<string, unknown>) => new MockMutationBuilder("unknown", data),
    delete: () => ({
      eq: () => ({ then: (resolve: (value: unknown) => void) => resolve({ data: null, error: null }) }),
      in: () => ({ then: (resolve: (value: unknown) => void) => resolve({ data: null, error: null }) }),
    }),
    storage: new MockStorageBuilder(),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
    }),
  };
}

// Real Supabase client creation
function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase env vars: ${[!supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL", !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(Boolean).join(", ")}. ` +
      "Check Vercel environment variables for Production environment. " +
      "Node env: " + (process.env.NODE_ENV ?? "unknown")
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Create proxy that routes to real or mock client
let realSupabase: SupabaseClient | null = null;
if (!useMockData) {
  try {
    realSupabase = getSupabase();
  } catch {
    // Will use mock below
  }
}

export const supabase: SupabaseClient = useMockData || !realSupabase
  ? createMockClient() as unknown as SupabaseClient
  : realSupabase;

export { supabaseUrl, supabaseAnonKey, useMockData };
