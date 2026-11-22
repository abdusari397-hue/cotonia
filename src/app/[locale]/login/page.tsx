import { ShieldCheck, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { demoLogin } from "@/actions/auth";
import { LoginForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dashboardPath, goTo } from "@/lib/guards";
import { demoMode, site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginButton") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const next = typeof raw.next === "string" ? raw.next : undefined;

  const user = await getCurrentUser();
  if (user) return goTo(dashboardPath(user.role));
  const t = await getTranslations("auth");

  const demos = [
    { account: "retailer", label: t("demoRetailer"), detail: "Little Steps Boutique · Germany", icon: <Store aria-hidden /> },
    { account: "admin", label: t("demoAdmin"), detail: site.name, icon: <ShieldCheck aria-hidden /> },
  ];

  return (
    <div className="shell grid place-items-center py-12 lg:py-16">
      <div className="w-full max-w-md space-y-5">
        <Card className="p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("loginTitle")}</h1>
          <p className="mt-1 text-muted">{t("loginSubtitle")}</p>
          <LoginForm next={next} />
          <p className="mt-6 text-center text-sm text-muted">
            {t("noAccount")}{" "}
            <Link href="/register/retailer" className="font-semibold text-brand-700 hover:text-brand-600">
              {t("createAccount")}
            </Link>
          </p>
        </Card>

        {demoMode() ? (
          <Card className="border-dashed p-5">
            <h2 className="font-sans text-sm font-semibold text-ink">{t("demoTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("demoText")}</p>
            <div className="mt-4 grid gap-2">
              {demos.map((demo) => (
                <form key={demo.account} action={demoLogin}>
                  <input type="hidden" name="account" value={demo.account} />
                  <button
                    type="submit"
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-canvas px-3 text-start transition hover:border-line-strong hover:bg-cream"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-brand-600 shadow-xs [&_svg]:size-4">
                      {demo.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{demo.label}</span>
                      <span className="block truncate text-xs text-muted">{demo.detail}</span>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
