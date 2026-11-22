import Link from "next/link";

// Fallback 404 for URLs outside the localized app (for example /api/...).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "4rem 1rem",
          textAlign: "center",
          color: "#1F2544",
          background: "#FBF8F4",
        }}
      >
        <h1>Page not found</h1>
        <p>
          <Link href="/en" style={{ color: "#B83A26" }}>
            Go to the homepage
          </Link>
        </p>
      </body>
    </html>
  );
}
