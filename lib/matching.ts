import type { ProductResult } from "@/lib/product"

function tokensFor(title: string, brand: string | null): string[] {
  return `${brand ?? ""} ${title}`
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((token) => token.length > 1)
}

// Choose the best product for an item: every brand+title token must appear
// in the product name; shorter (more specific) names win; a size that
// mentions the item's unit or quantity gets a bonus, so the 1-gal jug
// beats the half-gallon for a 1 gal item.
export function bestMatch(
  entries: ProductResult[],
  title: string,
  brand: string | null,
  qty: number,
  unit: string | null
): ProductResult | null {
  const tokens = tokensFor(title, brand)
  if (tokens.length === 0) return null
  const unitToken = unit?.toLowerCase() ?? null
  const qtyToken = Number.isInteger(qty) ? String(qty) : null

  let best: ProductResult | null = null
  let bestScore = -Infinity
  for (const entry of entries) {
    const name = entry.name.toLowerCase()
    let matched = 0
    for (const token of tokens) {
      if (name.includes(token)) matched++
    }
    if (matched < tokens.length) continue
    let score = matched * 10 - entry.name.length / 100
    if (unitToken && name.includes(unitToken)) score += 5
    if (qtyToken && name.includes(qtyToken)) score += 3
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }
  return best
}