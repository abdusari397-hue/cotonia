import { Globe, Heart, LayoutDashboard, MessageCircle, Package, Search, ShoppingCart } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { LOCALE_NAMES, type Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { currencyLabel } from "@/lib/currency";
import { prisma } from "@/lib/db";
import { dashboardPath } from "@/lib/guards";
import { unreadCount } from "@/lib/messaging";
import { getPreferences } from "@/lib/preferences";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LanguageLinks } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { PreferencesForm } from "./preferences-form";
import { UserMenu } from "./user-menu";

// Layout follows the Cotonia design: logo, language, currency and shopping icons on the
// left; main links and account buttons on the right. The two sides keep their places in
// Arabic (rtl:flex-row-reverse), while the text inside each group reads right to left.
export async function SiteHeader() {
  const [t, te, locale, user, prefs] = await Promise.all([
    getTranslations("nav"),
    getTranslations("enums"),
    getLocale(),
    getCurrentUser(),
    getPreferences(),
  ]);
  const [cartCount, unread] = user
    ? await Promise.all([
        user.role === "RETAILER" ? prisma.cartItem.count({ where: { userId: user.id } }) : 0,
        unreadCount(user),
      ])
    : [0, 0];

  const shopper = !user || user.role === "RETAILER";
  const searchAction = `/${locale}/search`;
  const messagesHref = user?.role === "WHOLESALER" ? "/seller/messages" : "/account/messages";
  const navLinks = [
    { href: "/products", label: t("products") },
    { href: "/wholesalers", label: t("suppliers") },
    { href: "/categories", label: t("categories") },
    { href: "/track", label: t("track") },
    { href: "/how-it-works", label: t("howItWorks") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur print:hidden">
      <div className="shell flex h-[4.5rem] items-center justify-between gap-3 rtl:flex-row-reverse">
        {/* Logo · language · currency · icons */}
        <div className="flex min-w-0 items-center gap-1 rtl:flex-row-reverse">
          <Link href="/" className="me-1 shrink-0 rounded-xl sm:me-3" aria-label={site.name}>
            <Logo />
          </Link>
          <div className="hidden items-center gap-0.5 lg:flex rtl:flex-row-reverse">
            <Popover
              align="left"
              ariaLabel={`${t("language")}: ${LOCALE_NAMES[locale as Locale]}`}
              className="h-10 rounded-lg px-2.5 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-ink"
              panelClassName="w-52 p-2"
              label={
                <>
                  <Globe className="size-[18px]" aria-hidden />
                  {LOCALE_NAMES[locale as Locale]}
                </>
              }
            >
              <LanguageLinks />
            </Popover>
            <Popover
              align="left"
              ariaLabel={`${t("currency")}: ${prefs.currency}`}
              className="h-10 rounded-lg px-2.5 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-ink"
              panelClassName="w-72"
              label={<span dir="ltr">{currencyLabel(prefs.currency)}</span>}
            >
              <PreferencesForm currency={prefs.currency} shipTo={prefs.shipTo} idPrefix="header-prefs" />
            </Popover>
          </div>
          <div className="flex items-center rtl:flex-row-reverse">
            <Popover
              align="left"
              chevron={false}
              ariaLabel={t("search")}
              className="hidden size-10 justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 hover:text-ink md:inline-flex"
              panelClassName="w-[min(26rem,calc(100vw-2rem))] p-3"
              label={<Search className="size-5" aria-hidden />}
            >
              <SearchForm
                action={searchAction}
                labels={{
                  search: t("search"),
                  searchIn: t("searchIn"),
                  products: t("searchProducts"),
                  suppliers: t("searchSuppliers"),
                  placeholder: t("searchPlaceholder"),
                }}
              />
            </Popover>
            {shopper ? (
              <>
                <HeaderIcon href="/account/saved" label={t("favorites")}>
                  <Heart aria-hidden />
                </HeaderIcon>
                <HeaderIcon href="/cart" label={t("cart")} count={cartCount} showZero>
                  <ShoppingCart aria-hidden />
                </HeaderIcon>
              </>
            ) : null}
            {user?.role === "WHOLESALER" ? (
              <HeaderIcon href="/seller/orders" label={t("orders")}>
                <Package aria-hidden />
              </HeaderIcon>
            ) : null}
            {user && user.role !== "ADMIN" ? (
              <HeaderIcon href={messagesHref} label={t("messages")} count={unread}>
                <MessageCircle aria-hidden />
              </HeaderIcon>
            ) : null}
          </div>
        </div>

        {/* Main links · account */}
        <div className="flex items-center gap-2 rtl:flex-row-reverse">
          <nav aria-label={t("mainNav")} className="hidden items-center gap-1 xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-[0.95rem] font-medium whitespace-nowrap text-ink transition hover:bg-brand-50 hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {user ? (
            <div className="hidden sm:block">
              <UserMenu
                name={user.name}
                roleLabel={te(`role.${user.role}`)}
                dashboardHref={dashboardPath(user.role)}
                labels={{
                  dashboard: t("dashboard"),
                  logout: t("logout"),
                  signedInAs: t("signedInAs", { email: user.email }),
                  menu: t("menu"),
                }}
              />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={buttonClasses({ variant: "soft", size: "sm", className: "h-10 px-4" })}>
                {t("login")}
              </Link>
              <Link href="/register/retailer" className={buttonClasses({ size: "sm", className: "h-10 px-4" })}>
                {t("register")}
              </Link>
            </div>
          )}
          <MobileNav
            links={navLinks}
            searchAction={searchAction}
            labels={{
              open: t("openMenu"),
              close: t("closeMenu"),
              menu: t("menu"),
              search: t("search"),
              placeholder: t("searchPlaceholder"),
            }}
          >
            <div className="space-y-4 border-t border-line pt-4">
              {user ? (
                <div className="grid gap-2 sm:hidden">
                  <Link href={dashboardPath(user.role)} className={buttonClasses({ variant: "soft", className: "w-full" })}>
                    <LayoutDashboard className="size-4" aria-hidden />
                    {t("dashboard")}
                  </Link>
                  <form action={logout}>
                    <button type="submit" className={buttonClasses({ variant: "ghost", className: "w-full" })}>
                      {t("logout")}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="grid gap-2 sm:hidden">
                  <Link href="/register/retailer" className={buttonClasses({ className: "w-full" })}>
                    {t("register")}
                  </Link>
                  <Link href="/login" className={buttonClasses({ variant: "soft", className: "w-full" })}>
                    {t("login")}
                  </Link>
                </div>
              )}
              <div>
                <p className="mb-1 px-3 text-xs font-semibold text-muted">{t("language")}</p>
                <LanguageLinks />
              </div>
              <div className="rounded-2xl bg-sand p-3">
                <PreferencesForm currency={prefs.currency} shipTo={prefs.shipTo} idPrefix="mobile-prefs" />
              </div>
            </div>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}

function SearchForm({
  action,
  labels,
}: {
  action: string;
  labels: { search: string; searchIn: string; products: string; suppliers: string; placeholder: string };
}) {
  return (
    <form action={action} method="get" role="search" className="flex items-center gap-2">
      <label htmlFor="header-search-type" className="sr-only">
        {labels.searchIn}
      </label>
      <select
        id="header-search-type"
        name="type"
        className="h-11 shrink-0 rounded-xl border border-line-strong bg-surface px-2 text-sm font-medium text-ink focus:border-brand-600 focus:outline-none"
      >
        <option value="products">{labels.products}</option>
        <option value="suppliers">{labels.suppliers}</option>
      </select>
      <label htmlFor="header-search" className="sr-only">
        {labels.search}
      </label>
      <input
        id="header-search"
        name="q"
        type="search"
        autoFocus
        placeholder={labels.placeholder}
        className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none"
      />
      <button
        type="submit"
        aria-label={labels.search}
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700"
      >
        <Search className="size-5" aria-hidden />
      </button>
    </form>
  );
}

function HeaderIcon({
  href,
  label,
  count = 0,
  showZero = false,
  className,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  showZero?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label} (${count})` : label}
      title={label}
      className={cn(
        "relative grid size-10 place-items-center rounded-lg text-ink-soft transition hover:bg-brand-50 hover:text-ink [&_svg]:size-5",
        className,
      )}
    >
      {children}
      {count > 0 || showZero ? (
        <span className="absolute end-0 top-0.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-brand-600 px-1 text-[0.65rem] font-bold text-white ring-2 ring-surface">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
