import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { UserActions } from "@/components/admin/user-actions";
import { Badge, USER_TONE } from "@/components/ui/badge";
import { Flag } from "@/components/ui/flag";
import { cleanQuery } from "@/components/ui/pagination";
import { Card, PageHeader } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { isOneOf, ROLES, USER_STATUSES } from "@/lib/constants";
import { countryName } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/lib/guards";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("usersTitle") };
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole("ADMIN", "/admin/users");
  const raw = await searchParams;
  const role = isOneOf(ROLES, raw.role) ? raw.role : undefined;
  const status = isOneOf(USER_STATUSES, raw.status) ? raw.status : undefined;
  const [t, te, currentLocale] = await Promise.all([
    getTranslations("admin"),
    getTranslations("enums"),
    getLocale(),
  ]);
  const members = await prisma.user.findMany({
    where: { ...(role ? { role } : {}), ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { retailer: true, store: true },
  });

  const filterRow = (
    key: "role" | "status",
    options: readonly string[],
    current: string | undefined,
    label: (value: string) => string,
  ) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="me-1 text-xs font-semibold tracking-wider text-muted uppercase">
        {key === "role" ? t("filterRole") : t("filterStatus")}
      </span>
      {[undefined, ...options].map((value) => {
        const active = value === current;
        return (
          <Link
            key={value ?? "all"}
            href={{ pathname: "/admin/users", query: cleanQuery({ role, status, [key]: value }) }}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition",
              active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:text-ink",
            )}
          >
            {value ? label(value) : t("all")}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div>
      <PageHeader title={t("usersTitle")} subtitle={t("usersSubtitle")} />
      <div className="mb-5 space-y-3">
        {filterRow("role", ROLES, role, (value) => te(`role.${value}`))}
        {filterRow("status", USER_STATUSES, status, (value) => te(`userStatus.${value}`))}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-canvas text-xs font-semibold tracking-wider text-muted uppercase">
              <tr>
                <th className="px-5 py-3 text-start">{t("colMember")}</th>
                <th className="px-3 py-3 text-start">{t("colRole")}</th>
                <th className="px-3 py-3 text-start">{t("colCountry")}</th>
                <th className="px-3 py-3 text-start">{t("colStatus")}</th>
                <th className="px-3 py-3 text-start">{t("colJoined")}</th>
                <th className="px-5 py-3 text-end">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => {
                const business = member.retailer?.shopName ?? member.store?.name;
                const country = member.retailer?.country ?? member.store?.country;
                return (
                  <tr key={member.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">
                        {member.store ? (
                          <Link href={`/wholesalers/${member.store.slug}`} className="hover:text-brand-700">
                            {business}
                          </Link>
                        ) : (
                          (business ?? member.name)
                        )}
                        {member.store?.verified ? (
                          <Badge tone="info" className="ms-2">
                            {t("verifiedBadge")}
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">
                        {member.name} · {member.email}
                      </p>
                    </td>
                    <td className="px-3 py-3">{te(`role.${member.role}`)}</td>
                    <td className="px-3 py-3">
                      {country ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Flag code={country} />
                          {countryName(country, currentLocale)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={USER_TONE[member.status]}>{te(`userStatus.${member.status}`)}</Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted">{formatDate(member.createdAt, currentLocale)}</td>
                    <td className="px-5 py-3">
                      <UserActions user={member} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
