import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import Link from "next/link";

export default async function AdvancedSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const isPlatform = adminUser.role === "platform_admin";

  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/admin/settings" className="text-sm text-stone-500 hover:text-stone-700">← Back to Settings</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">Advanced Settings</h1>
          <p className="mt-1 text-stone-600">Platform &amp; AI configuration, feature flags, and integrations.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/settings/ai" className="block rounded-2xl border bg-white p-6 hover:shadow">
            <div className="font-semibold">AI Intelligence Pack</div>
            <div className="text-sm text-stone-500 mt-1">Provider keys, model preferences, and usage for campaign writer, pricing advisor, etc.</div>
          </Link>
          <Link href="/admin/settings/integrations" className="block rounded-2xl border bg-white p-6 hover:shadow">
            <div className="font-semibold">Integrations</div>
            <div className="text-sm text-stone-500 mt-1">Resend, Twilio, Stripe, Square, and custom AI providers.</div>
          </Link>
          <Link href="/admin/settings/square-sync" className="block rounded-2xl border bg-white p-6 hover:shadow">
            <div className="font-semibold">Square Sync</div>
            <div className="text-sm text-stone-500 mt-1">Inventory &amp; product sync configuration.</div>
          </Link>
          <Link href="/admin/settings/shipping" className="block rounded-2xl border bg-white p-6 hover:shadow">
            <div className="font-semibold">Shipping &amp; FedEx</div>
            <div className="text-sm text-stone-500 mt-1">Rates, label creation, and settings.</div>
          </Link>
        </div>

        {!isPlatform && (
          <p className="mt-8 text-xs text-stone-500">Some advanced options are only visible to platform administrators.</p>
        )}

        <div className="mt-8 text-xs text-stone-400">
          These pages aggregate the real configuration surfaces. Feature flags live under Apps in the main settings.
        </div>
      </div>
    </main>
  );
}
