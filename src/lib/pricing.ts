export type PriceTier = { minSeries: number; pricePerPiece: number };
export type LadderStep = { from: number; to: number | null; pricePerPiece: number };

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseSizes(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function parseTiers(json: string): PriceTier[] {
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value
      .map((tier) => ({
        minSeries: Number((tier as PriceTier).minSeries),
        pricePerPiece: Number((tier as PriceTier).pricePerPiece),
      }))
      .filter(
        (tier) =>
          Number.isInteger(tier.minSeries) &&
          tier.minSeries > 1 &&
          Number.isFinite(tier.pricePerPiece) &&
          tier.pricePerPiece > 0,
      )
      .sort((a, b) => a.minSeries - b.minSeries);
  } catch {
    return [];
  }
}

/** Price per piece for a given total number of series of one product. */
export function unitPrice(basePrice: number, tiers: PriceTier[], totalSeries: number): number {
  let price = basePrice;
  for (const tier of tiers) {
    if (totalSeries >= tier.minSeries) price = tier.pricePerPiece;
  }
  return price;
}

/** Quantity-based price ladder, as shown to buyers ("2–9 series: $4.20"). */
export function priceLadder(
  basePrice: number,
  minSeries: number,
  tiers: PriceTier[],
): LadderStep[] {
  const steps: LadderStep[] = [{ from: Math.max(1, minSeries), to: null, pricePerPiece: basePrice }];
  for (const tier of tiers) {
    const last = steps[steps.length - 1];
    if (tier.minSeries <= last.from) {
      last.pricePerPiece = tier.pricePerPiece;
      continue;
    }
    last.to = tier.minSeries - 1;
    steps.push({ from: tier.minSeries, to: null, pricePerPiece: tier.pricePerPiece });
  }
  return steps;
}
