import { notFound } from "next/navigation";

// Unknown URLs inside a locale render [locale]/not-found.tsx with the site layout.
export default function CatchAll() {
  notFound();
}
