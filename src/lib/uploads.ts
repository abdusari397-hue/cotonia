import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Local file storage for development. Swap for S3 / Cloudflare R2 in production.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export class UploadError extends Error {
  readonly code: "imageType" | "imageSize";
  constructor(code: "imageType" | "imageSize") {
    super(code);
    this.code = code;
  }
}

export function isFilledFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && value.size > 0;
}

/** Saves an uploaded image and returns its public URL. */
export async function saveImageUpload(file: File): Promise<string> {
  const extension = EXTENSIONS[file.type];
  if (!extension) throw new UploadError("imageType");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("imageSize");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${extension}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export function contentTypeFor(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}
