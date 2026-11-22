# Cotonia design system

> Updated for the Cotonia design: warm browns (brand-600 `#6B4436`, cocoa `#4A2F26`), cream backgrounds, pastel category tiles, Inter + Poppins (English) and IBM Plex Sans Arabic (Arabic). Tokens live in `src/app/globals.css`; older notes below may mention the previous coral palette.

Professional B2B marketplace with a warm, kid-friendly touch. Clean product-first layouts,
soft colours in illustrations and accents, strong contrast for text and actions.

## Colour tokens (`src/app/globals.css`)

| Token | Use |
| --- | --- |
| `ink` `#1F2544` | primary text, dark surfaces, active navigation |
| `ink-soft`, `muted` | secondary text (muted passes 4.5:1 on canvas and white) |
| `canvas` `#FBF8F4` | page background; `surface` white for cards |
| `line`, `line-strong` | borders |
| `brand` `#FF6B57` | decoration only: logo, illustrations, highlights |
| `brand-600` `#CF432D` | primary buttons (white text, 4.6:1) |
| `brand-700` `#B83A26` | text links |
| `mint`, `sky`, `sun`, `lilac` (+ `-50` tints) | category and stat accents |
| `success`, `warning`, `danger`, `info` (+ `-bg`) | status badges and notices, all 4.5:1 or better |

Never put white text on `brand`, `mint`, `sky` or `sun`. Use the `-600/-700` shades or ink.

## Type

- Display: **Poppins** (h1, h2, logo, big numbers); Arabic pages use **IBM Plex Sans Arabic**.
- Body/UI: **Inter**, 16px base, line-height 1.5, minimum 12px.
- Both include Latin Extended for Turkish. Add an Arabic face when Arabic goes live.

## Components

- Cards: `rounded-card` (20px), `border-line`, `shadow-card`; hover `shadow-lift` and lift 2px.
- Buttons: pill shape, 44px tall (`md`), `sm` (36px) only in dense tables.
- Badges: soft tinted background with matching dark text (`Badge` tones).
- Member cards (`BusinessCard`): Retailer = teal to blue, Wholesaler = coral to brick, Admin = ink to indigo.
- Product images: 4:5 portrait. Illustrations come from `/api/art/...` until real photos are uploaded.
- Flags: SVG (`Flag`). Emoji flags don't render on Windows.

## Rules

- Mobile first; no horizontal page scroll (tables scroll inside their card).
- Use logical properties (`ms/me/ps/pe/start/end`) so Arabic (RTL) mirrors automatically; flip
  directional icons with `rtl:rotate-180`.
- Visible labels on every field; errors under the field; focus ring `brand-600`.
- Icons from lucide-react; never emoji as icons.
- Animations are subtle (transform/opacity) and respect `prefers-reduced-motion`.
