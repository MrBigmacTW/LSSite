import { getAllTemplates } from "@/lib/db";
import TemplateManager from "./TemplateManager";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await getAllTemplates();

  const serialized = templates.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    slug: t.slug as string,
    category: t.category as string,
    imagePath: t.imagePath as string,
    printArea: typeof t.printArea === "string" ? JSON.parse(t.printArea as string) : t.printArea,
    active: !!t.active,
    sortOrder: t.sortOrder as number,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg mb-8">模板管理</h1>
      <TemplateManager templates={serialized} />
    </div>
  );
}
