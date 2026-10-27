import { matchBrandPrefix } from "@/lib/brands"

// The universal currency of the store layer: every store adapter returns
// products in this shape, and everything downstream (matching, splitting,
// the picker) works against it without knowing which store produced it.
// price is null when the store's search serves catalog data but no prices
// (Whole Foods) — the picker still works; only the price stays blank.
export type ProductResult = { name: string; price: number | null }

// The plug-and-play contract for a store. An adapter hides everything
// specific to that store's website — its search route, location/store id,
// headers, response format — behind these functions.
export interface StoreAdapter {
  // Full-text search at the store; returns shelf prices when the store
  // serves them.
  searchProducts: (query: string) => Promise<ProductResult[]>
  // Optional bulk catalog, used as a match fallback when search comes up
  // empty. Most stores won't have one.
  getCatalog?: () => Promise<ProductResult[]>
  // False when the store's search serves catalog data but no prices
  // (Whole Foods). Defaults to true; a priceless store gets search in the
  // picker but no price fetcher, so Lookup Prices skips its lists.
  servesPrices?: boolean
}

export type PackageSize = { qty: number; unit: string }

// A trailing package size: "(12 ct)", "(1 gal)", "(5 lb)", or a bare
// trailing "59 fl oz". Anchored to the end of the name so mid-name numbers
// ("80/20", "100%") are never mistaken for sizes. "Count" reads as "ct"
// (Whole Foods names say "18 Count"), so a 12-count is still a dozen.
// The size-unit alternation shared with adapters (Target interpolates it
// into its own title regexes). SIZE_RE below uses the same alternation.
export const SIZE_UNIT_PATTERN =
  "gal|qt|pt|fl oz|oz|lb|ct|count|ea|each|l|ml|g"

const SIZE_RE =
  /(?:\((\d+(?:\.\d+)?)\s*(gal|qt|pt|fl oz|oz|lb|ct|count|ea|each|l|ml|g)\)|\((gal|qt|pt|fl oz|oz|lb|ct|count|ea|each|l|ml|g)\)|(\d+(?:\.\d+)?)\s*(gal|qt|pt|fl oz|oz|lb|ct|count|ea|each|l|ml|g))\s*$/i

export function parsePackageSize(
  fullName: string
): (PackageSize & { nameWithoutSize: string }) | null {
  const m = fullName.match(SIZE_RE)
  if (!m) return null
  const qty = m[1] ? Number(m[1]) : m[4] ? Number(m[4]) : 1
  const rawUnit = (m[2] ?? m[3] ?? m[5]).toLowerCase()
  const unit = rawUnit === "count" ? "ct" : rawUnit
  if (!Number.isFinite(qty)) return null
  const nameWithoutSize = fullName.slice(0, m.index).replace(/[,\s]+$/, "").trim()
  return { qty, unit, nameWithoutSize }
}

export type SplitProductName = {
  brand: string | null
  title: string
  sizeQty: number | null
  sizeUnit: string | null
}

// Split a storefront product name into the app's item fields: the package
// size comes off first (it becomes qty/unit), then the longest known brand
// prefix becomes the brand and the verbatim remainder becomes the title.
export function splitProductName(fullName: string): SplitProductName {
  const size = parsePackageSize(fullName)
  const base = size?.nameWithoutSize ?? fullName.trim()
  const match = matchBrandPrefix(base)
  return {
    brand: match?.brand ?? null,
    title: match ? match.rest : base,
    sizeQty: size?.qty ?? null,
    sizeUnit: size?.unit ?? null,
  }
}

// Convert a parsed package size into item qty/unit fields. The product's
// price is per package, so qty is the package count and the size folds
// into the unit label — with two friendly normalizations (12 ct is a
// dozen; 16 oz is a pound).
export function packageFieldsFor(
  sizeQty: number,
  sizeUnit: string
): { qty: number; unit: string } {
  const unit = sizeUnit.toLowerCase()
  if (unit === "ct" && sizeQty % 12 === 0) return { qty: sizeQty / 12, unit: "dozen" }
  if (unit === "oz" && sizeQty % 16 === 0) return { qty: sizeQty / 16, unit: "lb" }
  if (sizeQty === 1) return { qty: 1, unit }
  return { qty: 1, unit: `${sizeQty} ${unit}` }
}