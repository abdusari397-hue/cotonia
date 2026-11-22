import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/components/messages/messages-view";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title") };
}

export default async function AccountThreadPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireRole("RETAILER", `/account/messages/${id}`);
  return <MessagesView user={user} viewer="RETAILER" activeId={id} />;
}
