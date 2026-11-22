import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { artUrl } from "@/lib/art";
import { AGE_GROUPS, GENDERS, SEASONS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { localizedName } from "@/lib/localized";
import { publicProductWhere } from "@/lib/queries";

const TILE_BACKGROUNDS = ["bg-rose-50", "bg-sun-50", "bg-sky-50", "bg-sand", "bg-mint-50", "bg-lilac-50"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("categoriesPage");
  return { title: t("title") };
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, te, categories] = await Promise.all([
    getTranslations("categoriesPage"),
    getTranslations("enums"),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: publicProductWhere } } } },
    }),
  ]);

  return (
    <div className="shell py-10 lg:py-14">
      <h1 className="text-3xl font-bold text-cocoa sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t("subtitle")}</p>

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category, index) => (
          <li key={category.id}>
            <Link
              href={{ pathname: "/products", query: { category: category.slug } }}
              className={`group flex h-full flex-col items-center gap-3 rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:shadow-card ${TILE_BACKGROUNDS[index % TILE_BACKGROUNDS.length]}`}
            >
              <img
                src={artUrl(category.art, category.color, { transparent: true })}
                alt=""
                loading="lazy"
                width={400}
                height={500}
                className="aspect-square w-full max-w-36 object-contain transition duration-300 group-hover:scale-105"
              />
              <span className="font-semibold text-ink">{localizedName(category, locale)}</span>
              <span className="text-sm text-muted">{t("productCount", { count: category._count.products })}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        <Group title={t("byGender")}>
          {GENDERS.map((gender) => (
            <Chip key={gender} href={`/products?gender=${gender}`}>
              {te(`gender.${gender}`)}
            </Chip>
          ))}
        </Group>
        <Group title={t("byAge")}>
          {AGE_GROUPS.map((age) => (
            <Chip key={age} href={`/products?age=${age}`}>
              {te(`ageGroup.${age}`)}
            </Chip>
          ))}
        </Group>
        <Group title={t("bySeason")}>
          {SEASONS.map((season) => (
            <Chip key={season} href={`/products?season=${season}`}>
              {te(`season.${season}`)}
            </Chip>
          ))}
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-sans text-lg font-semibold text-ink">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">{children}</ul>
    </section>
  );
}

function Chip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition hover:border-brand-600 hover:bg-brand-50"
      >
        {children}
      </Link>
    </li>
  );
}
