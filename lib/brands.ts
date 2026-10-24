// Known brands for splitting storefront product names into brand + title.
// Matching is a longest-prefix match against this list (see product.ts).
// Add a brand here when the picker meets one it doesn't know yet.
export const KNOWN_BRANDS: string[] = [
  "Organic Valley",
  "Contented Hen",
  "Vital Farms",
  "Natural Grocers",
  "Maple Hill",
  "Kalona SuperNatural",
  "Outside the Breadbox",
  "Thousand Hills",
  "Sprouts",
  "Happy Egg",
  "Chino Valley Ranchers",
  "Organick Pastures",
  "Just Food Company",
  "Egglife",
  "Red's",
  "Three Bridges",
  "Applegate",
  "Bob's Red Mill",
  "Alexandre Family Farm",
  "Pasture Bird",
  "365 by Whole Foods Market",
  "Whole Foods Market",
  "Horizon Organic",
]

const BRANDS_LONGEST_FIRST = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)

// If `name` starts with a known brand, return the canonical brand and the
// remainder of the name. "Natural Grocers Brand X" normalizes to the brand
// "Natural Grocers" with the word "Brand" dropped.
export function matchBrandPrefix(
  name: string
): { brand: string; rest: string } | null {
  const lower = name.toLowerCase()
  for (const brand of BRANDS_LONGEST_FIRST) {
    const b = brand.toLowerCase()
    if (lower === b || lower.startsWith(`${b} `)) {
      let rest = name.slice(brand.length).trim()
      if (brand === "Natural Grocers" && rest.toLowerCase().startsWith("brand ")) {
        rest = rest.slice("brand ".length).trim()
      }
      return { brand, rest }
    }
  }
  return null
}