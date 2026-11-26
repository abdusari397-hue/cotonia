# Cotonia

A global B2B wholesale marketplace for children's clothing. Retailers (shops, online stores,
chains) buy directly from wholesalers (manufacturers, wholesalers, importers) in **series**
(size runs). Works like Alibaba: buyers chat with suppliers, post buying requests and receive
quotes, and see prices tiered by quantity.

The name comes from cotton. Change it in `src/lib/site.ts` (logo: `src/components/brand/logo.tsx`).

The site is in **English and Arabic** (right-to-left): `/en/...` and `/ar/...`, with a language switcher in the header and footer. This site is the **buyers' platform**. Suppliers have their own separate platform: supplier accounts cannot log in or register here (`buyerPlatform` in `src/lib/site.ts`). The supplier dashboard code (`/seller`) is kept as the starting point for that separate platform. Buyers can follow their orders on `/track` (order number + account email).

## تشغيل المشروع

1. `npm install`
2. `npm run setup`: creates the database and loads the demo data (also `npm run db:reset` to start over)
3. `npm run dev`, then open http://localhost:3000
4. The login page has quick-login buttons for the three demo accounts (retailer, wholesaler, admin).

## Demo accounts

Created by `prisma/seed.ts`. **Local development only.**

| Account    | Email                     | Business                         |
| ---------- | ------------------------- | -------------------------------- |
| Retailer   | `retailer@cotonia.test`   | Little Steps Boutique (Germany)  |
| Wholesaler | `wholesaler@cotonia.test` | Pamuk Baby Textile (Türkiye)     |
| Admin      | `admin@cotonia.test`      | Platform admin                   |

Every demo account (including the other seeded shops and suppliers) uses the password
the password set in `DEMO_PASSWORD` in `.env`. With `DEMO_MODE="true"` in `.env`, the login page also shows one-click demo
logins. They only appear in development (`npm run dev`).

## Features

**Account types (each with its own member card and dashboard)**
- **Retailer card**: browse with prices, cart, orders, messages, buying requests, saved products, business profile.
- **Wholesaler card**: product catalog (series, colours, stock, tier prices, photos), incoming orders, messages, quoting on buying requests, public store page.
- **Admin card**: approve or reject businesses, verify suppliers, feature or hide products, all orders, categories.

**Alibaba-style experience**
- Header (Cotonia design): logo, language, currency (USD, EUR, GBP, TRY, SAR, AED, EGP) and "deliver to" country, search, saved products, cart, main links and account buttons.
- Home page: hero with search by country, category, price and keyword; main category tiles; trust strip; most requested products; how it works; trusted suppliers from Türkiye. A `/categories` page lists every category.
- Product cards with price range, minimum order, series sold, rating and supplier years; compare up to 4 products side by side.
- Product page: price ladder, customization (custom logo and packaging minimums), sample orders, shipping and lead time, order protection, attributes, packaging and delivery, reviews, supplier performance, similar products.
- Supplier mini-site: Home, Products, Company profile (factory, employees, capacity, revenue, export markets, certifications) and Reviews, with response time, response rate, order completion and paid orders computed from real activity.
- Buyers review products after delivery; ratings update automatically.
- Wholesaler dashboard: product views, new inquiries, response rate, store rating and most viewed products.

**Marketplace**
- Catalog with filters (category, gender, age, season, country of origin, verified suppliers, manufacturers, ready to ship, price range, minimum order, rating), search and sorting (best selling, newest, top rated, price).
- Products sold in series (one piece per size), minimum order per product, supplier minimum order value, quantity price tiers.
- Prices are public, like on Alibaba (`publicPrices` in `src/lib/site.ts`); ordering, samples and messaging need an approved retailer account.
- One cart for several suppliers; checkout sends one order request per supplier.
- Order flow: Pending → Confirmed (supplier adds shipping cost) → Paid → Shipped → Delivered, with history, notes, tracking and a printable proforma invoice.
- Messaging: one thread per retailer and supplier, product inquiries with quantity, unread badges, auto-refresh.
- Buying requests (RFQ): retailers post needs; suppliers send quotes (price, minimum, lead time), which also opens a chat; buyers accept or decline.
- Info pages: how it works, size guide, FAQ, about, contact, terms, privacy.

## Tech

- Next.js 16 (App Router, Server Actions, `src/proxy.ts`) with TypeScript and Tailwind CSS 4
- next-intl: UI texts in `messages/en.json` and `messages/ar.json`; URLs are prefixed with the locale (`/en/...`, `/ar/...`). Product and category names can be stored per language (`nameTranslations` JSON).
- Prisma 6 with SQLite for local development (`prisma/schema.prisma`)
- Session cookies with scrypt-hashed passwords (`src/lib/auth.ts`, `src/lib/password.ts`)
- Product illustrations generated as SVG (`src/lib/art.ts`, served by `/api/art/[garment]`); uploaded photos go to `uploads/` (served by `/uploads/...`)

## Project structure

```
messages/en.json, ar.json UI texts (add tr.json for Turkish)
prisma/schema.prisma      data model
prisma/seed.ts            demo data
src/actions/              Server Actions (auth, cart, orders, messages, rfq, seller, admin)
src/app/[locale]/         pages (storefront, account/, seller/, admin/, rfq/, ...)
src/components/           UI and feature components
src/i18n/                 locales, routing and request config
src/lib/                  database, auth, pricing, cart, queries, validation
docs/design-system.md     colours, type and component rules
```

## Scripts

| Command            | What it does                               |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | start the development server               |
| `npm run build`    | production build                           |
| `npm run setup`    | create the database and load demo data     |
| `npm run db:reset` | wipe the database and reload demo data     |
| `npm run typecheck`| TypeScript check                           |
| `npm run lint`     | ESLint                                     |

## Adding Turkish

1. Copy `messages/en.json` to `messages/tr.json` and translate the values.
2. Add `"tr"` to `locales` and `LOCALE_NAMES` in `src/i18n/routing.ts`.
3. Add Turkish product and category names to `nameTranslations` (see `prisma/seed.ts`).

Arabic uses Western digits (0-9) and IBM Plex Sans Arabic; English uses Inter and Poppins.

## Deploying on Vercel

1. On vercel.com, sign in with GitHub, choose **Add New → Project** and import this repository.
2. In **Settings → Environment Variables**, add `DEMO_PASSWORD` (your own password for the demo
   accounts, 8+ characters).
3. In the project, open **Storage → Create Database → Neon** and connect it to the project
   (this adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`).
4. Redeploy. `vercel.json` runs `scripts/vercel-build.mjs`, which switches Prisma to PostgreSQL,
   creates the tables, loads the demo data into an empty database (`prisma/seed-if-empty.ts`)
   and builds the site. Local development keeps using SQLite.

Demo login buttons are hidden in production; sign in with the demo accounts above and change the
admin password before sharing the link widely.

## Before going live

- Move from SQLite to PostgreSQL: set `provider = "postgresql"` and a hosted `DATABASE_URL`.
- Store uploads in S3 or Cloudflare R2 instead of the local `uploads/` folder.
- Set `DEMO_MODE` to `false` and replace the demo data with real accounts.
- Replace the placeholder images in `public/images/` (cut from the design mockup) and the `#` social links in `src/lib/site.ts`.
- Add transactional email (order and message notifications), password reset and online payments.
- Exchange rates in `src/lib/currency.ts` are fixed approximations: update them or connect a rates API.
- Have a lawyer review the terms and privacy pages.
