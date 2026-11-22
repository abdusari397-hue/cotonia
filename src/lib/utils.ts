import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  const slug = input
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "item";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short human-friendly code without look-alike characters (0/O, 1/I). */
export function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

/** Member number printed on the account card, e.g. CT-R-4F7K2Q. */
export function memberId(user: { id: string; role: string }): string {
  const prefix = user.role === "WHOLESALER" ? "W" : user.role === "ADMIN" ? "A" : "R";
  return `CT-${prefix}-${user.id.slice(-6).toUpperCase()}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value === "" ? null : value;
}

/** Ink or white text, whichever reads better on the given background colour. */
export function textOn(hex: string): "#1F2544" | "#FFFFFF" {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#FFFFFF";
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.3 ? "#1F2544" : "#FFFFFF";
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
