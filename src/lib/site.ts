// Platform-wide settings. The name is a placeholder and can be changed here.
export const site = {
  name: "Cotonia",
  supportEmail: "hello@cotonia.test",
  currency: "USD",
  /**
   * Like Alibaba, wholesale prices are visible to every visitor. Set to false to
   * show prices only to approved retailers. Ordering always needs an approved retailer.
   */
  publicPrices: true,
  /**
   * This site is the buyers' platform. Suppliers have their own platform, so supplier
   * accounts cannot sign in or register here.
   */
  buyerPlatform: true,
  /** Social profiles shown in the footer. Replace the "#" placeholders with your real pages. */
  social: {
    facebook: "#",
    instagram: "#",
    x: "#",
    linkedin: "#",
    youtube: "#",
  },
} as const;

/** Seeded demo accounts (see prisma/seed.ts and README.md). */
export const DEMO_ACCOUNTS = {
  retailer: "retailer@cotonia.test",
  wholesaler: "wholesaler@cotonia.test",
  admin: "admin@cotonia.test",
} as const;

/** One-click demo logins are only available in local development. */
export function demoMode(): boolean {
  return process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
}
