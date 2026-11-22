import { getTranslations } from "next-intl/server";

/** Renders a legal text from the "pages.<name>" messages (title, updated, sections[]). */
export async function LegalPage({ name }: { name: "terms" | "privacy" }) {
  const t = await getTranslations(`pages.${name}`);
  const sections = t.raw("sections") as { title: string; body: string }[];
  return (
    <div className="shell py-10 lg:py-16">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("updated")}</p>
        <div className="mt-8 space-y-8">
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-24">
              <h2 className="font-sans text-xl font-semibold text-ink">{section.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
