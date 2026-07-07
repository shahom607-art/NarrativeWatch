import { getEducation } from "@/lib/data";

export default async function EducationPage() {
  const content = await getEducation();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Education & media literacy</h1>
        <p className="mt-2 text-sm text-amber-400">{content.disclaimer}</p>
        <p className="text-xs text-gray-500">Last updated: {content.lastUpdated} · Draft for review</p>
      </div>

      {content.sections.map((section) => (
        <section key={section.id} className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {section.content}
          </div>
        </section>
      ))}
    </div>
  );
}
