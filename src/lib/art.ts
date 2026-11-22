// Flat product illustrations. Used for demo products and as a placeholder
// when a wholesaler has not uploaded a photo yet. Served by /api/art/[garment].

export const GARMENTS = [
  "tshirt",
  "longsleeve",
  "dress",
  "skirt",
  "pants",
  "shorts",
  "hoodie",
  "jacket",
  "romper",
  "set",
  "pajama",
  "tracksuit",
  "shoes",
  "bow",
] as const;
export type Garment = (typeof GARMENTS)[number];

export const PATTERNS = ["none", "dots", "stripes", "stars", "checks", "hearts"] as const;
export type Pattern = (typeof PATTERNS)[number];

export const PRINTS = ["none", "heart", "star", "smile", "rainbow", "moon"] as const;
export type Print = (typeof PRINTS)[number];

/**
 * URL of an illustration, e.g. artUrl("dress", "#F7A8C4", { pattern: "dots" }).
 * `transparent` drops the coloured backdrop, for tiles that have their own background.
 */
export function artUrl(
  garment: string,
  color: string,
  options: { pattern?: string; print?: string; accent?: string; transparent?: boolean } = {},
): string {
  const query = new URLSearchParams({ c: color.replace("#", "") });
  if (options.pattern && options.pattern !== "none") query.set("p", options.pattern);
  if (options.print && options.print !== "none") query.set("pr", options.print);
  if (options.accent) query.set("a", options.accent.replace("#", ""));
  if (options.transparent) query.set("t", "1");
  return `/api/art/${garment}?${query.toString()}`;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

function parseHex(hex: string | null | undefined, fallback: string): string {
  const clean = (hex ?? "").replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean.toUpperCase()}` : fallback;
}

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function mix(a: string, b: string, t: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type Palette = {
  base: string;
  detail: string;
  band: string;
  light: string;
  patternFill: string;
  patternOpacity: number;
  print: string;
};

function palette(base: string): Palette {
  const dark = luminance(base) < 0.18;
  return {
    base,
    detail: dark ? mix(base, "#FFFFFF", 0.38) : mix(base, "#1F2544", 0.34),
    band: dark ? mix(base, "#FFFFFF", 0.14) : mix(base, "#1F2544", 0.15),
    light: mix(base, "#FFFFFF", 0.6),
    patternFill: dark ? "#FFFFFF" : mix(base, "#1F2544", 0.3),
    patternOpacity: dark ? 0.35 : 0.32,
    print: dark ? "#FFD166" : "#FFFFFF",
  };
}

// ---------------------------------------------------------------------------
// Shapes (400 x 500 canvas)
// ---------------------------------------------------------------------------

type Shape = {
  body: string;
  back?: string;
  details: (p: Palette) => string;
  chest?: [number, number];
  shadowY: number;
};

const fill = (d: string, color: string, extra = "") =>
  `<path d="${d}" fill="${color}" ${extra}/>`;

const line = (d: string, color: string, width = 3, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const stitch = (d: string, color: string, width = 2.5) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="6 6" opacity=".7"/>`;

const circle = (cx: number, cy: number, r: number, color: string, extra = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" ${extra}/>`;

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${points.join(" L")} Z`;
}

const SHAPES = {
  tshirt: {
    body: "M165 110 Q200 140 235 110 L290 126 L338 186 L302 212 L284 194 L284 382 Q200 392 116 382 L116 194 L98 212 L62 186 L110 126 Z",
    details: (p) =>
      line("M165 110 Q200 140 235 110", p.band, 9) +
      stitch("M329 175 L295 205", p.detail) +
      stitch("M71 175 L105 205", p.detail) +
      stitch("M116 368 Q200 378 284 368", p.detail),
    chest: [200, 240],
    shadowY: 420,
  },
  longsleeve: {
    body: "M165 110 Q200 140 235 110 L290 126 L338 300 L304 312 L284 206 L284 382 Q200 392 116 382 L116 206 L96 312 L62 300 L110 126 Z",
    details: (p) =>
      line("M165 110 Q200 140 235 110", p.band, 9) +
      line("M334 286 L301 299", p.band, 9) +
      line("M66 286 L99 299", p.band, 9) +
      stitch("M116 368 Q200 378 284 368", p.detail),
    chest: [200, 240],
    shadowY: 420,
  },
  dress: {
    body: "M170 100 Q200 126 230 100 L256 106 Q242 142 266 162 L256 222 Q292 300 322 392 Q200 414 78 392 Q108 300 144 222 L134 162 Q158 142 144 106 Z",
    details: (p) =>
      line("M170 100 Q200 126 230 100", p.band, 6) +
      fill("M143 214 L257 214 L259 236 L141 236 Z", p.band) +
      line("M178 238 Q170 320 152 398", p.detail, 2.5, 'opacity=".35"') +
      line("M200 238 L200 404", p.detail, 2.5, 'opacity=".35"') +
      line("M222 238 Q230 320 248 398", p.detail, 2.5, 'opacity=".35"') +
      stitch("M88 384 Q200 404 312 384", p.light, 3) +
      fill("M200 225 L178 212 L178 238 Z M200 225 L222 212 L222 238 Z", p.detail) +
      circle(200, 225, 6, p.detail),
    shadowY: 440,
  },
  skirt: {
    body: "M128 140 L272 140 L276 168 Q306 260 336 372 Q200 398 64 372 Q94 260 124 168 Z",
    details: (p) =>
      fill("M128 140 L272 140 L276 168 L124 168 Z", p.band) +
      circle(200, 154, 5, p.light) +
      line("M160 170 Q150 270 128 382", p.detail, 2.5, 'opacity=".35"') +
      line("M200 170 L200 392", p.detail, 2.5, 'opacity=".35"') +
      line("M240 170 Q250 270 272 382", p.detail, 2.5, 'opacity=".35"') +
      stitch("M76 362 Q200 386 324 362", p.light, 3),
    shadowY: 424,
  },
  pants: {
    body: "M134 92 L266 92 L270 118 L288 404 L214 404 L200 232 L186 404 L112 404 L130 118 Z",
    details: (p) =>
      fill("M134 92 L266 92 L270 118 L130 118 Z", p.band) +
      line("M194 118 L190 150", p.light, 3) +
      line("M206 118 L210 150", p.light, 3) +
      line("M200 118 L200 196", p.detail, 2.5, 'opacity=".5"') +
      line("M138 134 Q166 142 170 118", p.detail, 2.5, 'opacity=".6"') +
      line("M262 134 Q234 142 230 118", p.detail, 2.5, 'opacity=".6"') +
      fill("M113 384 L187 384 L186 404 L112 404 Z", p.band) +
      fill("M213 384 L287 384 L288 404 L214 404 Z", p.band),
    shadowY: 430,
  },
  shorts: {
    body: "M128 150 L272 150 L276 176 L302 312 L212 322 L200 248 L188 322 L98 312 L124 176 Z",
    details: (p) =>
      fill("M128 150 L272 150 L276 176 L124 176 Z", p.band) +
      line("M194 176 L190 204", p.light, 3) +
      line("M206 176 L210 204", p.light, 3) +
      line("M134 192 Q160 198 164 176", p.detail, 2.5, 'opacity=".6"') +
      line("M266 192 Q240 198 236 176", p.detail, 2.5, 'opacity=".6"') +
      stitch("M104 297 L186 306", p.detail) +
      stitch("M214 306 L296 297", p.detail),
    shadowY: 350,
  },
  hoodie: {
    back: "M146 128 Q144 56 200 54 Q256 56 254 128 Z",
    body: "M162 112 Q200 142 238 112 L294 130 L344 302 L310 316 L284 206 L284 398 Q200 408 116 398 L116 206 L90 316 L56 302 L106 130 Z",
    details: (p) =>
      fill("M162 112 Q200 88 238 112 Q200 150 162 112 Z", p.detail, 'opacity=".55"') +
      line("M186 134 L182 196", p.light, 4) +
      circle(182, 200, 4, p.light) +
      line("M214 134 L218 196", p.light, 4) +
      circle(218, 200, 4, p.light) +
      fill("M146 292 L254 292 L270 352 L130 352 Z", p.band) +
      fill("M116 382 Q200 392 284 382 L284 398 Q200 408 116 398 Z", p.band) +
      line("M339 286 L306 299", p.band, 9) +
      line("M61 286 L94 299", p.band, 9),
    chest: [200, 250],
    shadowY: 434,
  },
  jacket: {
    body: "M152 122 L248 122 L300 136 L346 308 L308 322 L284 210 L284 404 L116 404 L116 210 L92 322 L54 308 L100 136 Z",
    details: (p) =>
      [168, 214, 260, 306, 352]
        .map((y) => line(`M117 ${y} Q200 ${y + 10} 283 ${y}`, p.detail, 2.5, 'opacity=".35"'))
        .join("") +
      fill("M158 96 L242 96 L248 124 L152 124 Z", p.band) +
      line("M200 100 L200 404", p.detail, 4) +
      `<rect x="194" y="128" width="12" height="22" rx="3" fill="${p.detail}"/>` +
      line("M134 300 L172 290", p.detail, 5) +
      line("M266 300 L228 290", p.detail, 5) +
      fill("M116 388 L284 388 L284 404 L116 404 Z", p.band) +
      line("M342 294 L305 308", p.band, 9) +
      line("M58 294 L95 308", p.band, 9),
    shadowY: 430,
  },
  romper: {
    body: "M168 108 Q200 134 232 108 L282 122 L322 176 L292 200 L272 184 L272 296 Q272 350 238 384 L228 412 L172 412 L162 384 Q128 350 128 296 L128 184 L108 200 L78 176 L118 122 Z",
    details: (p) =>
      line("M168 108 Q200 134 232 108", p.band, 8) +
      stitch("M314 165 L284 194", p.detail) +
      stitch("M86 165 L116 194", p.detail) +
      [184, 200, 216]
        .map((x) => circle(x, 402, 4.5, p.light, `stroke="${p.detail}" stroke-width="1.5"`))
        .join(""),
    chest: [200, 240],
    shadowY: 438,
  },
  // One shoe in side view; "shoes" draws a pair.
  shoe: {
    body: "M92 318 Q88 252 128 238 L172 230 Q192 228 200 246 L212 272 Q282 278 308 306 Q320 320 310 330 L100 330 Q92 328 92 318 Z",
    details: (p) =>
      fill("M86 324 L318 324 Q332 324 332 338 Q332 352 318 352 L100 352 Q86 352 86 338 Z", p.light) +
      line("M86 324 L318 324 Q332 324 332 338 Q332 352 318 352 L100 352 Q86 352 86 338 Z", p.detail, 3) +
      line("M150 246 L172 276", p.light, 6) +
      line("M136 258 L160 288", p.light, 6) +
      line("M232 284 Q272 290 296 312", p.detail, 2.5, 'opacity=".6"') +
      stitch("M100 312 L300 312", p.detail),
    shadowY: 368,
  },
  bow: {
    back: "M190 262 L148 374 L172 364 L186 386 L212 272 Z M210 262 L252 374 L228 364 L214 386 L188 272 Z",
    body: "M200 248 Q152 172 98 190 Q66 202 72 248 Q78 296 108 306 Q150 320 200 248 Z M200 248 Q248 172 302 190 Q334 202 328 248 Q322 296 292 306 Q250 320 200 248 Z",
    details: (p) =>
      line("M104 222 Q140 238 176 246", p.detail, 3, 'opacity=".5"') +
      line("M296 222 Q260 238 224 246", p.detail, 3, 'opacity=".5"') +
      fill("M178 222 Q200 212 222 222 Q232 248 222 274 Q200 284 178 274 Q168 248 178 222 Z", p.band) +
      line("M178 222 Q200 212 222 222 Q232 248 222 274 Q200 284 178 274 Q168 248 178 222 Z", p.detail, 3),
    shadowY: 412,
  },
} satisfies Record<string, Shape>;

const TRACK_STRIPES =
  line("M131 122 L114 402", "#FFFFFF", 7, 'opacity=".9"') +
  line("M269 122 L286 402", "#FFFFFF", 7, 'opacity=".9"');

function printMarkup(print: Print, [cx, cy]: [number, number], p: Palette): string {
  switch (print) {
    case "heart":
      return `<path d="M${cx} ${cy + 24} C${cx - 40} ${cy - 2} ${cx - 26} ${cy - 36} ${cx} ${cy - 16} C${cx + 26} ${cy - 36} ${cx + 40} ${cy - 2} ${cx} ${cy + 24} Z" fill="${p.print}"/>`;
    case "star":
      return `<path d="${starPath(cx, cy, 30, 13)}" fill="${p.print}"/>`;
    case "smile":
      return (
        circle(cx, cy, 28, "#FFD166") +
        circle(cx - 10, cy - 6, 3.5, "#1F2544") +
        circle(cx + 10, cy - 6, 3.5, "#1F2544") +
        line(`M${cx - 13} ${cy + 6} Q${cx} ${cy + 18} ${cx + 13} ${cy + 6}`, "#1F2544", 3.5)
      );
    case "rainbow":
      return (
        [
          ["#FF6B57", 32],
          ["#FFD166", 23],
          ["#5AA9F2", 14],
        ] as const
      )
        .map(
          ([color, r]) =>
            `<path d="M${cx - r} ${cy + 14} A${r} ${r} 0 0 1 ${cx + r} ${cy + 14}" fill="none" stroke="${color}" stroke-width="8"/>`,
        )
        .join("");
    case "moon":
      return (
        `<path d="M${cx + 6} ${cy - 28} A28 28 0 1 0 ${cx + 6} ${cy + 28} A34 34 0 0 1 ${cx + 6} ${cy - 28} Z" fill="#FFD166"/>` +
        `<path d="${starPath(cx + 20, cy - 10, 7, 3)}" fill="#FFD166"/>`
      );
    default:
      return "";
  }
}

function patternDef(id: string, pattern: Pattern, p: Palette): string {
  const c = p.patternFill;
  const o = p.patternOpacity;
  const open = (size: number) =>
    `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">`;
  switch (pattern) {
    case "dots":
      return `${open(28)}${circle(7, 7, 4, c, `fill-opacity="${o}"`)}${circle(21, 21, 4, c, `fill-opacity="${o}"`)}</pattern>`;
    case "stripes":
      return `${open(24)}<rect width="24" height="10" fill="${c}" fill-opacity="${o}"/></pattern>`;
    case "checks":
      return `${open(32)}<rect width="16" height="32" fill="${c}" fill-opacity="${o * 0.8}"/><rect width="32" height="16" fill="${c}" fill-opacity="${o * 0.8}"/></pattern>`;
    case "stars":
      return `${open(44)}<path d="${starPath(11, 11, 7, 3)}" fill="${c}" fill-opacity="${o + 0.1}"/><path d="${starPath(33, 33, 5, 2.2)}" fill="${c}" fill-opacity="${o + 0.1}"/></pattern>`;
    case "hearts":
      return `${open(40)}<path d="M12 18 C4 12 6 4 12 8 C18 4 20 12 12 18 Z" fill="${c}" fill-opacity="${o + 0.1}"/><path d="M30 36 C22 30 24 22 30 26 C36 22 38 30 30 36 Z" fill="${c}" fill-opacity="${o + 0.1}"/></pattern>`;
    default:
      return "";
  }
}

function garmentGroup(
  shape: Shape,
  p: Palette,
  patternId: string | null,
  print: Print,
  transform?: string,
  extra = "",
): string {
  const t = transform ? ` transform="${transform}"` : "";
  const back = shape.back ? fill(shape.back, p.band) + line(shape.back, p.detail, 3) : "";
  const patternLayer = patternId ? fill(shape.body, `url(#${patternId})`) : "";
  const chest = shape.chest && print !== "none" ? printMarkup(print, shape.chest, p) : "";
  return (
    `<g${t}>${back}${fill(shape.body, p.base)}${patternLayer}` +
    `${fill(shape.body, "url(#shade)")}${shape.details(p)}${extra}${chest}` +
    `${line(shape.body, p.detail, 3)}</g>`
  );
}

function isIn<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function renderGarmentSvg(params: {
  garment: string;
  color?: string | null;
  accent?: string | null;
  pattern?: string | null;
  print?: string | null;
  transparent?: boolean;
}): string {
  const garment: Garment = isIn(GARMENTS, params.garment) ? params.garment : "tshirt";
  const pattern: Pattern = isIn(PATTERNS, params.pattern) ? params.pattern : "none";
  const print: Print = isIn(PRINTS, params.print) ? params.print : "none";
  const base = parseHex(params.color, "#FF6B57");
  const p = palette(base);
  const pa = palette(parseHex(params.accent, mix(base, "#1F2544", 0.45)));
  const patternId = pattern === "none" ? null : "pat";

  let content: string;
  let shadowY: number;
  switch (garment) {
    case "set":
      content =
        garmentGroup(SHAPES.shorts, pa, null, "none", "translate(40 140) scale(0.8)") +
        garmentGroup(SHAPES.tshirt, p, patternId, print, "translate(68 -12.6) scale(0.66)");
      shadowY = 424;
      break;
    case "pajama":
      content =
        garmentGroup(SHAPES.pants, p, patternId, "none", "translate(76 171) scale(0.62)") +
        garmentGroup(SHAPES.longsleeve, p, patternId, print, "translate(80 -22) scale(0.6)");
      shadowY = 446;
      break;
    case "shoes":
      content =
        garmentGroup(SHAPES.shoe, p, patternId, "none", "translate(-2 -58)") +
        garmentGroup(SHAPES.shoe, p, patternId, "none", "translate(22 48)");
      shadowY = 412;
      break;
    case "tracksuit":
      content =
        garmentGroup(SHAPES.pants, pa, null, "none", "translate(80 181) scale(0.6)", TRACK_STRIPES) +
        garmentGroup(SHAPES.hoodie, p, patternId, print, "translate(96 12) scale(0.52)");
      shadowY = 448;
      break;
    default: {
      const shape: Shape = SHAPES[garment];
      content = garmentGroup(shape, p, patternId, print);
      shadowY = shape.shadowY;
    }
  }

  const veryLight = luminance(base) > 0.72;
  const bg = veryLight ? "#EDF1F7" : mix(base, "#FFFFFF", 0.86);
  const bg2 = veryLight ? "#E2E8F1" : mix(base, "#FFFFFF", 0.76);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">` +
    `<defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity=".16"/>` +
    `<stop offset="1" stop-color="#000000" stop-opacity=".07"/></linearGradient>` +
    `${patternId ? patternDef(patternId, pattern, p) : ""}</defs>` +
    (params.transparent
      ? ""
      : `<rect width="400" height="500" fill="${bg}"/>` + circle(336, 78, 64, bg2) + circle(52, 432, 46, bg2)) +
    `<ellipse cx="200" cy="${shadowY}" rx="128" ry="13" fill="#1F2544" opacity=".07"/>` +
    content +
    `</svg>`
  );
}
