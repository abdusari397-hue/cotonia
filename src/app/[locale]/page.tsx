import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  CreditCard,
  Headset,
  LayoutGrid,
  MapPin,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { prisma } from "@/lib/db";
import { canSeePrices } from "@/lib/guards";
import { localizedName } from "@/lib/localized";
import { getFavoriteIds, getHomeData, getStoreCountries, publicStoreWhere } from "@/lib/queries";
import { cn, initials, textOn } from "@/lib/utils";

/** "Browse main categories" tiles: each one opens the catalog with a filter. */
const TILES = [
  { key: "newborn", href: "/products?age=BABY", photo: "peach-striped-bodysuit", tile: "bg-sand" },
  { key: "boys", href: "/products?gender=BOY", photo: "plaid-flannel-shirt", tile: "bg-sky-50" },
  { key: "girls", href: "/products?gender=GIRL", photo: "strawberry-blouse", tile: "bg-rose-50" },
  { key: "summer", href: "/products?season=SPRING_SUMMER", photo: "gingham-sundress", tile: "bg-sun-50" },
  { key: "winter", href: "/products?season=AUTUMN_WINTER", photo: "raincoat", tile: "bg-sky-50" },
  { key: "dresses", href: "/products?category=dresses", photo: "lilac-tulle-dress", tile: "bg-rose-50" },
  { key: "sets", href: "/products?category=sets", photo: "gentleman-set", tile: "bg-sand" },
  { key: "pants", href: "/products?category=bottoms", photo: "wide-leg-jeans", tile: "bg-sky-50" },
  { key: "shoes", href: "/products?category=shoes", photo: "mary-jane-shoes", tile: "bg-rose-50" },
  { key: "accessories", href: "/products?category=accessories", photo: "grosgrain-bow", tile: "bg-rose-50" },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tc, user, data, countries, turkishSuppliers] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getCurrentUser(),
    getHomeData(),
    getStoreCountries(),
    prisma.store.findMany({
      where: { ...publicStoreWhere, verified: true, country: "TR" },
      orderBy: { createdAt: "asc" },
      take: 4,
      select: { id: true, name: true, slug: true, brandColor: true, city: true },
    }),
  ]);
  const favorites = user?.role === "RETAILER" ? await getFavoriteIds(user.id) : null;
  const showPrices = canSeePrices(user);
  const bestSellers = data.products.slice(0, 8);
  return (
    <>
      {/* Hero: the photo stays on the right and the text on the left in every language, like the design. */}
      <section className="relative isolate overflow-hidden bg-cream">
        <img
          src="/images/hero-kids.jpg"
          alt=""
          width={578}
          height={239}
          className="h-52 w-full object-cover object-top sm:h-64 md:hidden"
        />
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[66%] md:block lg:w-[64%]">
          <img src="/images/hero-kids.jpg" alt="" className="size-full object-cover object-[50%_20%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/0 via-30% to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream/70 to-transparent" />
        </div>
        <div className="shell relative pt-6 pb-24 md:pt-14 md:pb-32 lg:pt-14 lg:pb-36">
          <div className="max-w-md md:mr-auto md:max-w-[34%] lg:max-w-[36%]">
            <h1 className="text-[1.9rem] leading-tight font-bold text-cocoa sm:text-4xl lg:text-[2.6rem]">
              {t("heroTitle")}
            </h1>
            <p className="mt-2 text-2xl font-medium text-ink-soft sm:text-[1.75rem] lg:text-3xl">{t("heroSubtitle")}</p>
            <p className="mt-4 text-base leading-relaxed text-ink-soft lg:text-lg">{t("heroText")}</p>
          </div>
        </div>
      </section>

      {/* Search card overlapping the hero */}
      <section className="shell relative z-10 -mt-16 md:-mt-24" aria-labelledby="home-search-title">
        <h2 id="home-search-title" className="sr-only">
          {t("searchTitle")}
        </h2>
        <form
          action={`/${locale}/search`}
          method="get"
          role="search"
          className="grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-2xl border border-line bg-surface p-3 shadow-lift sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,2fr)_auto]"
        >
          <SelectField id="home-country" name="country" label={t("searchCountry")} icon={<MapPin aria-hidden />}>
            <option value="">{t("searchCountry")}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {countryName(country.code, locale)}
              </option>
            ))}
          </SelectField>
          <SelectField id="home-category" name="category" label={t("searchCategory")} icon={<LayoutGrid aria-hidden />}>
            <option value="">{t("searchCategory")}</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {localizedName(category, locale)}
              </option>
            ))}
          </SelectField>
          <div className="flex h-12 items-center rounded-xl border border-line-strong bg-surface ps-3 transition focus-within:border-brand-600 focus-within:ring-3 focus-within:ring-brand-100 sm:col-span-2 lg:col-span-1">
            <Search className="size-[18px] shrink-0 text-muted" aria-hidden />
            <label htmlFor="home-q" className="sr-only">
              {t("searchKeyword")}
            </label>
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            <label htmlFor="home-type" className="sr-only">
              {t("searchType")}
            </label>
            <div className="relative shrink-0 border-s border-line">
              <select
                id="home-type"
                name="type"
                className="h-10 appearance-none bg-transparent ps-3 pe-8 text-sm font-medium text-ink focus:outline-none"
              >
                <option value="products">{t("typeProducts")}</option>
                <option value="suppliers">{t("typeSuppliers")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white transition hover:bg-brand-700 sm:col-span-2 lg:col-span-1 lg:w-14 lg:px-0"
          >
            <Search className="size-5" aria-hidden />
            <span className="lg:sr-only">{t("searchButton")}</span>
          </button>
        </form>
      </section>

      {/* Main categories */}
      <section className="shell mt-12">
        <SectionTitle title={t("categoriesTitle")} action={<ViewAll href="/categories" label={tc("viewAll")} />} />
        <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-10">
          {TILES.map((tile) => (
            <li key={tile.key} className="w-28 shrink-0 sm:w-auto">
              <Link
                href={tile.href}
                className={cn(
                  "group flex h-full flex-col items-center gap-2 rounded-2xl border border-transparent p-2.5 pb-3 text-center transition hover:-translate-y-0.5 hover:border-line hover:shadow-card",
                  tile.tile,
                )}
              >
                <img
                  src={`/images/products/${tile.photo}.webp`}
                  alt=""
                  loading="lazy"
                  width={400}
                  height={400}
                  className="aspect-square w-full rounded-xl object-cover mix-blend-multiply transition duration-300 group-hover:scale-105"
                />
                <span className="text-[0.8rem] leading-snug font-semibold text-ink">{t(`tiles.${tile.key}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Trust strip */}
      <section className="shell mt-10">
        <ul className="grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-sand sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:rtl:divide-x-reverse">
          {[
            { icon: <ShieldCheck aria-hidden />, title: t("trustSuppliers"), text: t("trustSuppliersText") },
            { icon: <ReceiptText aria-hidden />, title: t("trustOrders"), text: t("trustOrdersText") },
            { icon: <Truck aria-hidden />, title: t("trustShipping"), text: t("trustShippingText") },
            { icon: <Headset aria-hidden />, title: t("trustSupport"), text: t("trustSupportText") },
          ].map((item) => (
            <li key={item.title} className="flex items-center gap-3.5 px-5 py-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-brand-700 shadow-sm [&_svg]:size-[22px]">
                {item.icon}
              </span>
              <span>
                <span className="block font-semibold text-ink">{item.title}</span>
                <span className="block text-sm text-muted">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Best sellers */}
      <section className="shell mt-14">
        <SectionTitle title={t("bestTitle")} action={<ViewAll href="/products?sort=best_selling" label={tc("viewAll")} />} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {bestSellers.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showPrice={showPrices}
              favorite={favorites ? { active: favorites.has(product.id) } : undefined}
              guestFavorite={!user}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="shell mt-14">
        <div className="grid gap-8 rounded-2xl bg-cream px-6 py-8 sm:px-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-center lg:gap-10">
          <div>
            <h2 className="text-2xl font-bold text-cocoa">{t("howTitle")}</h2>
            <p className="mt-2 leading-relaxed text-ink-soft">{t("howText")}</p>
          </div>
          <ol className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-brand-100 lg:rtl:divide-x-reverse">
            {[
              { icon: <Search aria-hidden />, title: t("step1"), text: t("step1Text") },
              { icon: <ShoppingCart aria-hidden />, title: t("step2"), text: t("step2Text") },
              { icon: <CreditCard aria-hidden />, title: t("step3"), text: t("step3Text") },
              { icon: <Truck aria-hidden />, title: t("step4"), text: t("step4Text") },
              { icon: <PackageCheck aria-hidden />, title: t("step5"), text: t("step5Text") },
            ].map((step, index) => (
              <li key={step.title} className="flex flex-col items-center px-2 text-center">
                <span className="relative grid size-16 place-items-center rounded-full bg-surface text-brand-700 shadow-sm [&_svg]:size-7">
                  {step.icon}
                  <span className="absolute -end-1 -top-1 grid size-6 place-items-center rounded-full bg-cocoa text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </span>
                <span className="mt-3 font-semibold text-ink">{step.title}</span>
                <span className="mt-0.5 text-sm text-muted">{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trusted suppliers from Türkiye: dark panel on the left, supplier tiles on the right, like the design. */}
      {turkishSuppliers.length > 0 ? (
        <section className="shell mt-14">
          <div className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-sand p-3 lg:flex-row lg:items-stretch rtl:lg:flex-row-reverse">
            <div className="flex overflow-hidden rounded-xl bg-cocoa text-white lg:w-[46%] lg:shrink-0 rtl:flex-row-reverse">
              <div className="flex flex-1 flex-col justify-center gap-3 p-6 sm:p-7">
                <h2 className="text-xl font-bold sm:text-2xl">{t("turkeyTitle")}</h2>
                <p className="text-sm leading-relaxed text-white/80">{t("turkeyText")}</p>
                <Link
                  href="/wholesalers?country=TR"
                  className="mt-1 inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-cocoa transition hover:bg-brand-50"
                >
                  {t("turkeyCta")}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                </Link>
              </div>
              <div className="relative hidden w-[42%] shrink-0 sm:block" aria-hidden>
                <img src="/images/clothes-rack.jpg" alt="" className="size-full object-cover" />
                <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-cocoa to-transparent" />
              </div>
            </div>
            <ul className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              {turkishSuppliers.map((store) => (
                <li key={store.id}>
                  <Link
                    href={`/wholesalers/${store.slug}`}
                    className="flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-surface p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <span
                      aria-hidden
                      className="grid size-12 place-items-center rounded-full font-display text-base font-bold"
                      style={{ backgroundColor: store.brandColor, color: textOn(store.brandColor) }}
                    >
                      {initials(store.name)}
                    </span>
                    <span className="font-display text-sm leading-tight font-semibold" style={{ color: store.brandColor }}>
                      <span className="text-ink">{store.name}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <BadgeCheck className="size-4" aria-hidden />
                      {t("verified")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold text-cocoa">{title}</h2>
      {action}
    </div>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600">
      {label}
      <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
    </Link>
  );
}

function SelectField({
  id,
  name,
  label,
  icon,
  children,
}: {
  id: string;
  name: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted [&_svg]:size-[18px]">{icon}</span>
      <select
        id={id}
        name={name}
        defaultValue=""
        className="h-12 w-full appearance-none rounded-xl border border-line-strong bg-surface ps-10 pe-9 text-sm text-ink transition focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
