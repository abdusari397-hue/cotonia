import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, contentTypeFor } from "@/lib/uploads";

const SAFE_NAME = /^[a-f0-9]{24}\.(jpg|png|webp|gif|avif)$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const name = parts.join("/");
  if (!SAFE_NAME.test(name)) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(name),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
