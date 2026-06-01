import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const { data, error } = await supabase
    .from("brands")
    .select("*");

  return (
    <main className="min-h-screen bg-slate-50 p-10">
      <h1 className="text-3xl font-bold">
        Supabase Test
      </h1>

      <pre className="mt-8 rounded-xl bg-black p-6 text-sm text-green-400">
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  );
}