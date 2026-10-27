export function itemKeyFor(title: string, brand?: string | null): string {
  const t = title.trim().toLowerCase()
  const b = (brand ?? "").trim().toLowerCase()
  return b ? `${t} | ${b}` : t
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`
}

// The price book is keyed by store name + item key. Build one lookup from
// the rows a page already fetched, instead of inlining the Map in each page.
export function buildPriceLookup(
  rows: { store: string; itemKey: string; price: number }[]
): (store: string, title: string, brand: string | null) => number | null {
  const map = new Map(rows.map((row) => [`${row.store}|${row.itemKey}`, row.price]))
  return (store, title, brand) =>
    map.get(`${store}|${itemKeyFor(title, brand)}`) ?? null
}

// Shared total loop for the list and Full List pages: the estimated total
// (price x qty over priced items), how many items were priced, and how
// many items there are in total.
export function summarizePrices<T extends { qty: number }>(
  items: readonly T[],
  priceFor: (item: T) => number | null
): { estimatedTotal: number; pricedCount: number; itemCount: number } {
  let estimatedTotal = 0
  let pricedCount = 0
  for (const item of items) {
    const price = priceFor(item)
    if (price !== null) {
      estimatedTotal += price * item.qty
      pricedCount += 1
    }
  }
  return { estimatedTotal, pricedCount, itemCount: items.length }
}
