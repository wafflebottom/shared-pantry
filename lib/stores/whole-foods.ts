import type { ProductResult, StoreAdapter } from "@/lib/product"

// Whole Foods Market storefront. Simon's Denver store is Washington Park
// (wfmStoreId 10373) — recorded here, though the calls below don't need
// it: the search and products APIs serve catalog data with no login and no
// store context, from any connection (proven from the VM and from Simon's
// Mac on his home IP, Oct 24, 2026). Prices are a different story:
// offerDetails comes back null without a signed-in Amazon session, so
// this adapter is search-only (servesPrices: false) — the picker fills
// title/brand/size and the price stays blank for manual entry.
const SEARCH_URL = "https://www.wholefoodsmarket.com/api/wwos/rsi/search"
const PRODUCTS_URL = "https://www.wholefoodsmarket.com/api/wwos/products"

// One search page (30 results); the picker shows the first 15.
const SEARCH_SIZE = 30
// The browser batches ASINs so the query string stays short; 10 per call.
const PRODUCTS_BATCH_SIZE = 10

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
}

type JsonObj = Record<string, unknown>

async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// The search API requires `old` (the previous query text); for a fresh
// search it is the query itself — an empty `old` gets a 400.
async function searchAsinsOnce(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    text: query,
    old: query,
    size: String(SEARCH_SIZE),
    offset: "0",
    programType: "grocery",
  })
  const data = await getJson(`${SEARCH_URL}?${params}`)
  const results = (data as JsonObj | null)?.mainResultSet as JsonObj | undefined
  const list = results?.searchResults
  if (!Array.isArray(list)) return []
  const asins: string[] = []
  const seen = new Set<string>()
  for (const r of list as JsonObj[]) {
    const asin = r.asin
    if (typeof asin === "string" && asin && !seen.has(asin)) {
      seen.add(asin)
      asins.push(asin)
    }
  }
  return asins
}

// The search backend is flaky from a server fetch: the same query returns
// a full page about half the time and zero results the rest (verified by
// repeated identical calls, Oct 24, 2026). Retry an empty page before
// concluding the store has no match.
const SEARCH_ATTEMPTS = 4
const SEARCH_RETRY_DELAY_MS = 300

async function searchAsins(query: string): Promise<string[]> {
  for (let attempt = 0; attempt < SEARCH_ATTEMPTS; attempt++) {
    const asins = await searchAsinsOnce(query)
    if (asins.length > 0) return asins
    if (attempt < SEARCH_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_DELAY_MS))
    }
  }
  return []
}

// One products call resolves a batch of ASINs to catalog records. Names
// already carry their size ("...Eggs 12 Count, 12 CT"); the brand is
// prefixed below when the name omits it. The shared split code then pulls
// brand/title/size out of the composed name.
async function searchProducts(query: string): Promise<ProductResult[]> {
  try {
    const asins = await searchAsins(query)
    if (asins.length === 0) return []
    const byAsin = new Map<string, JsonObj>()
    for (let i = 0; i < asins.length; i += PRODUCTS_BATCH_SIZE) {
      const batch = asins.slice(i, i + PRODUCTS_BATCH_SIZE)
      const params = new URLSearchParams({ asins: batch.join(",") })
      const data = await getJson(`${PRODUCTS_URL}?${params}`)
      if (!Array.isArray(data)) continue
      for (const item of data as JsonObj[]) {
        const asin = item.asin
        if (typeof asin === "string" && asin && !byAsin.has(asin)) {
          byAsin.set(asin, item)
        }
      }
    }
    // Emit in search-rank (ASIN) order, deduped by name.
    const results: ProductResult[] = []
    const seenNames = new Set<string>()
    for (const asin of asins) {
      const item = byAsin.get(asin)
      const rawName = item?.name
      if (typeof rawName !== "string" || !rawName) continue
      // The API's `name` often omits the brand ("Organic Pasture-Raised
      // Large Eggs 12ct" with brandName "Vital Farms"); prefix it when the
      // name doesn't already start with it, so the shared split finds it.
      const brandName = item?.brandName
      const hasBrand =
        typeof brandName === "string" &&
        brandName.trim().length > 1 &&
        brandName.trim() !== "?" &&
        !rawName.toLowerCase().startsWith(brandName.trim().toLowerCase())
      const name = hasBrand ? `${brandName.trim()} ${rawName}` : rawName
      if (seenNames.has(name)) continue
      seenNames.add(name)
      // No price: offerDetails is null without a signed-in Amazon session.
      results.push({ name, price: null })
    }
    return results
  } catch {
    return []
  }
}

export const wholeFoodsAdapter: StoreAdapter = {
  searchProducts,
  servesPrices: false,
}
