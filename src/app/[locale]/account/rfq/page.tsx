import { ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RfqCard, rfqCardInclude } from "@/components/rfq/rfq-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rfq");
  return { title: t("myRequests") };
}

export default async function AccountRfqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireRole("RETAILER", "/account/rfq");
  const t = await getTranslations("rfq");
  const requests = await prisma.rfq.findMany({
    where: { retailerId: user.id },
    orderBy: { createdAt: "desc" },
    include: rfqCardInclude,
  });

  const post =
    user.status === "APPROVED" ? (
      <Link href="/rfq/new" className={buttonClasses()}>
        <Plus className="size-4" aria-hidden />
        {t("post")}
      </Link>
    ) : null;

  return (
    <div>
      <PageHeader title={t("myRequests")} subtitle={t("myRequestsSubtitle")} actions={post} />
      {requests.length === 0 ? (
        <EmptyState icon={<ClipboardList aria-hidden />} title={t("emptyTitle")} text={t("postIntro")} action={post} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {requests.map((rfq) => (
            <RfqCard key={rfq.id} rfq={rfq} />
          ))}
        </div>
      )}
    </div>
  );
}
