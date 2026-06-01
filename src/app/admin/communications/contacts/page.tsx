import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationCampaigns } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import { getContacts } from "@/actions/communications/contacts";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function ContactsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/admin");
  if (!adminUser.can_manage_messages) redirect("/admin/pickup");

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [campaignsResult, templatesResult, contactsResult] = await Promise.all([
    getCommunicationCampaigns(brandId),
    getCommunicationTemplates(brandId),
    getContacts({ brandId, limit: 50 }),
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
                    <h1 className="text-3xl font-bold text-stone-950">Harvest Reach</h1>
          <p className="mt-2 text-stone-500">
            Manage email campaigns, templates, contacts, and message history.
          </p>
        </div>

        <CommunicationsPage
          campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
          templates={templatesResult.success ? templatesResult.templates : []}
          activeTab="contacts"
          brandId={brandId}
          initialContacts={contactsResult.success ? contactsResult.contacts : []}
          initialContactTotal={contactsResult.success ? contactsResult.total : 0}
        />
      </div>
    </main>
  );
}
