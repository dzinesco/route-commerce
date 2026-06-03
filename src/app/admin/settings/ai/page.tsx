import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import Link from "next/link";

export default async function AISettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/settings" className="text-sm text-stone-500 hover:text-stone-700">← Back to Settings</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">AI Intelligence Settings</h1>
        <p className="mt-2 text-stone-600">Configure AI providers, keys, and preferences used by campaign writer, pricing advisor, report explainer, and other tools.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/admin/settings/integrations" className="rounded-2xl border bg-white p-6 block hover:shadow">Manage AI Provider Keys (OpenAI, Anthropic, etc.) →</Link>
          <Link href="/admin/settings/apps" className="rounded-2xl border bg-white p-6 block hover:shadow">Enable / disable the AI Tools add-on →</Link>
        </div>

        <div className="mt-6 text-sm text-stone-500">
          The actual AI client is wired in <code>@/actions/integrations/ai-providers</code> and used by the various <code>/api/ai/*</code> endpoints and admin tools.
        </div>
      </div>
    </main>
  );
}