import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationTemplates, getTemplateById } from "@/actions/communications/templates";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/admin");
  if (!adminUser.can_manage_messages) redirect("/admin/pickup");

  const { id } = await params;
  const isNew = id === "new";

  const templatesResult = await getCommunicationTemplates();
  const template = isNew ? undefined : id ? await getTemplateById(id) : undefined;

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Harvest Reach</h1>
        </div>

        <CommunicationsPage
          campaigns={[]}
          templates={templatesResult.success ? templatesResult.templates : []}
          activeTab="templates"
          brandId={adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de"}
          editTemplate={template}
          editMode={isNew ? "new" : "edit"}
        />
      </div>
    </main>
  );
}