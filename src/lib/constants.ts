export const ROLES = ["RETAILER", "WHOLESALER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const RETAILER_TYPES = [
  "BOUTIQUE",
  "ONLINE_STORE",
  "CHAIN",
  "DEPARTMENT_STORE",
  "DISTRIBUTOR",
  "OTHER",
] as const;
export const WHOLESALER_TYPES = ["MANUFACTURER", "WHOLESALER", "IMPORTER"] as const;

export const GENDERS = ["GIRL", "BOY", "UNISEX"] as const;
export const AGE_GROUPS = ["BABY", "KIDS", "JUNIOR"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
export const SEASONS = ["SPRING_SUMMER", "AUTUMN_WINTER", "ALL_SEASON"] as const;
export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT"] as const;

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const SHIPPING_METHODS = ["SELLER_SHIPS", "BUYER_CARGO"] as const;

export const RFQ_STATUSES = ["OPEN", "CLOSED"] as const;
export const QUOTE_STATUSES = ["SENT", "ACCEPTED", "DECLINED"] as const;

/** Common size runs. One piece of each size makes one series. */
export const SIZE_PRESETS: Record<AgeGroup, string[][]> = {
  BABY: [
    ["3-6M", "6-9M", "9-12M", "12-18M"],
    ["0-3M", "3-6M", "6-9M", "9-12M"],
    ["6-9M", "9-12M", "12-18M", "18-24M"],
  ],
  KIDS: [
    ["2Y", "3Y", "4Y", "5Y"],
    ["3Y", "4Y", "5Y", "6Y"],
    ["4Y", "5Y", "6Y", "7Y", "8Y"],
  ],
  JUNIOR: [
    ["8Y", "10Y", "12Y", "14Y"],
    ["9Y", "10Y", "11Y", "12Y"],
    ["10Y", "12Y", "14Y", "16Y"],
  ],
};

export const CATALOG_SORTS = ["best_selling", "newest", "top_rated", "price_asc", "price_desc"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const PAGE_SIZE = 24;

export function isOneOf<T extends readonly string[]>(
  list: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
