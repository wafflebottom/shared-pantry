import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { ProductResult, StoreAdapter } from "@/lib/product"
import { fetchText } from "@/lib/stores/http"

// Natural Grocers storefront (DoorDash-powered). Store 48664081 is the
// Design District store, 368 S Broadway, Denver, CO 80209. To use a
// different store, search on the site in a browser and copy the numeric id
// from /convenience/store/<id>/search/...
const NG_STORE_ID = "48664081"
const NG_SEARCH_BASE = `https://shop.naturalgrocers.com/convenience/store/${NG_STORE_ID}/search`
const NG_CATEGORY_BASE = "https://shop.naturalgrocers.com/category"

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
}

// Parse the name/price pairs out of a storefront page. The catalog data is
// embedded as backslash-escaped JSON, so unescape before matching.
function parseItemPrices(html: string): ProductResult[] {
  const clean = html.replace(/\\"/g, '"').replace(/\\u0022/gi, '"')
  const entries: ProductResult[] = []
  const seen = new Set<string>()
  const re = /"item_name":"([^"]+)"[\s\S]{0,400}?"display_string":"\$(\d+\.\d{2})"/g
  for (const m of clean.matchAll(re)) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    entries.push({ name: m[1], price: Number(m[2]) })
  }
  return entries
}

async function fetchPage(url: string, label: string): Promise<string | null> {
  return fetchText(url, BROWSER_HEADERS, "Natural Grocers", label)
}

async function searchProducts(query: string): Promise<ProductResult[]> {
  const url = `${NG_SEARCH_BASE}/${encodeURIComponent(query)}?attr_src=home&disable_spell_check=false`
  const html = await fetchPage(url, query)
  return html ? parseItemPrices(html) : []
}

// Bulk catalog built from the grocery category pages, cached on disk for
// 24h. Each page embeds only roughly its first 50 products, so coverage is
// partial — this is a fallback for when search finds no match.
const NG_CATEGORY_SLUGS = [
  "produce-964",
  "meat",
  "seafood",
  "dairy%20%26%20eggs-960",
  "deli",
  "prepared%20food",
  "bakery-958",
  "pantry-963",
  "frozen-961",
  "drinks-751",
  "snacks-758",
  "candy-750",
  "vitamins%20%26%20supplements-1125",
  "household-754",
  "personal%20care-757",
  "beauty-1123",
  "baby%20%26%20child-1791",
  "pet%20care-1026",
]
const CACHE_PATH = path.join(process.cwd(), "data", "natural-grocers-catalog.json")
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const NEGATIVE_CACHE_TTL_MS = 10 * 60 * 1000

let catalogInFlight: Promise<ProductResult[]> | null = null
let negativeCacheUntilMs = 0

type CatalogCache = {
  fetchedAt: string
  entries: ProductResult[]
  negativeUntil?: string
}

async function buildCatalog(): Promise<ProductResult[]> {
  const byName = new Map<string, ProductResult>()
  for (let i = 0; i < NG_CATEGORY_SLUGS.length; i += 4) {
    const batch = NG_CATEGORY_SLUGS.slice(i, i + 4)
    const pages = await Promise.all(
      batch.map((slug) => fetchPage(`${NG_CATEGORY_BASE}/${slug}`, slug))
    )
    for (const html of pages) {
      if (!html) continue
      for (const entry of parseItemPrices(html)) {
        if (!byName.has(entry.name)) byName.set(entry.name, entry)
      }
    }
  }
  return [...byName.values()]
}

async function getCatalog(): Promise<ProductResult[]> {
  if (Date.now() < negativeCacheUntilMs) return []
  try {
    const raw = await readFile(CACHE_PATH, "utf8")
    const cached = JSON.parse(raw) as CatalogCache
    if (
      cached.negativeUntil &&
      Date.now() < new Date(cached.negativeUntil).getTime()
    ) {
      negativeCacheUntilMs = new Date(cached.negativeUntil).getTime()
      return []
    }
    if (Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
      return cached.entries
    }
  } catch {
    // No usable cache; rebuild below.
  }
  if (!catalogInFlight) {
    catalogInFlight = buildCatalog()
      .then(async (entries) => {
        // On total failure nothing used to be cached, so every missed
        // lookup rebuilt all 18 category pages. A failed build now
        // writes a ~10 min negative-cache entry instead.
        const cacheEntry: CatalogCache =
          entries.length > 0
            ? { fetchedAt: new Date().toISOString(), entries }
            : {
                fetchedAt: new Date().toISOString(),
                entries: [],
                negativeUntil: new Date(Date.now() + NEGATIVE_CACHE_TTL_MS).toISOString(),
              }
        if (entries.length === 0) {
          negativeCacheUntilMs = Date.now() + NEGATIVE_CACHE_TTL_MS
        }
        try {
          await mkdir(path.dirname(CACHE_PATH), { recursive: true })
          await writeFile(CACHE_PATH, JSON.stringify(cacheEntry))
        } catch {
          // Caching is an optimization; a failed write changes nothing.
        }
        return entries
      })
      .finally(() => {
        catalogInFlight = null
      })
  }
  return catalogInFlight
}

export const naturalGrocersAdapter: StoreAdapter = {
  searchProducts,
  getCatalog,
}
