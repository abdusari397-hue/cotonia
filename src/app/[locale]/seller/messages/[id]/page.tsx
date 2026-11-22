import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesView } from "@/components/messages/messages-view";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title") };
}

export default async function SellerThreadPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireRole("WHOLESALER", `/seller/messages/${id}`);
  return <MessagesView user={user} viewer="WHOLESALER" activeId={id} />;
}
