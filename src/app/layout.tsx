import type { ReactNode } from "react";

// The <html> element lives in app/[locale]/layout.tsx so it can carry the
// language and text direction of the active locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
