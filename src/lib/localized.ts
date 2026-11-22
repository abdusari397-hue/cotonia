// Names entered in several languages are stored as JSON ({ "ar": "..." }) next to
// the original name. Pages show the visitor's language when it exists.

type Named = { name: string; nameTranslations?: string | null };

export function parseTranslations(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""),
    );
  } catch {
    return {};
  }
}

/** The item's name in `locale`, or its original name. */
export function localizedName(item: Named, locale: string): string {
  return parseTranslations(item.nameTranslations)[locale] ?? item.name;
}
