import { renderGarmentSvg } from "@/lib/art";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ garment: string }> },
) {
  const { garment } = await params;
  const query = new URL(request.url).searchParams;
  const svg = renderGarmentSvg({
    garment,
    color: query.get("c"),
    accent: query.get("a"),
    pattern: query.get("p"),
    print: query.get("pr"),
    transparent: query.get("t") === "1",
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
