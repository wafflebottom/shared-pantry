import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export type FetchedPrice = { price: number; unit?: string | null }

type PriceFetcher = (
  title: string,
  brand: string | null,
  qty: number,
  unit: string | null
) => Promise<FetchedPrice | null>

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
}

// Grocery-relevant departments from the storefront's 65 categories.
// Each category page embeds roughly its first 50 products.
const NG_CATEGORIES = [
  "/category/produce-964",
  "/category/meat-911548223244271740",
  "/category/seafood-911062372566958200",
  "/category/dairy%20%26%20eggs-960",
  "/category/deli-908597445830541430",
  "/category/prepared%20food-860364364644450352",
  "/category/bakery-958",
  "/category/pantry-963",
  "/category/frozen-961",
  "/category/drinks-751",
  "/category/snacks-758",
  "/category/candy-750",
  "/category/vitamins-1125",
  "/category/household-754",
  "/category/personal%20care-757",
  "/category/beauty-1123",
  "/category/baby%20%26%20child-1791",
  "/category/pet%20care-1026",
]

const CACHE_FILE = path.join(process.cwd(), "data", "natural-grocers-catalog.json")
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CatalogEntry = { name: string; price: number }

function parseItemPrices(html: string): CatalogEntry[] {
  const clean = html.replace(/\\"/g, '"').replace(/\\u0022/gi, '"')
  const entries: CatalogEntry[] = []
  const seen = new Set<string>()
  const re = /"item_name":"([^"]+)"[\s\S]{0,400}?"display_string":"\$(\d+\.\d{2})"/g
  for (const m of clean.matchAll(re)) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    entries.push({ name: m[1], price: Number(m[2]) })
  }
  return entries
}

async function fetchCategoryPage(slug: string): Promise<CatalogEntry[]> {
  try {
    const res = await fetch(`https://shop.naturalgrocers.com${slug}`, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
    })
    if (!res.ok) return []
    return parseItemPrices(await res.text())
  } catch {
    return []
  }
}

async function buildCatalog(): Promise<CatalogEntry[]> {
  const byName = new Map<string, CatalogEntry>()
  for (let i = 0; i < NG_CATEGORIES.length; i += 4) {
    const results = await Promise.all(NG_CATEGORIES.slice(i, i + 4).map(fetchCategoryPage))
    for (const entries of results) {
      for (const entry of entries) {
        if (!byName.has(entry.name)) byName.set(entry.name, entry)
      }
    }
  }
  return [...byName.values()]
}

async function getCatalog(): Promise<CatalogEntry[]> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8")
    const cached = JSON.parse(raw) as { fetchedAt: string; entries: CatalogEntry[] }
    if (Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
      return cached.entries
    }
  } catch {
    // no usable cache yet — build it
  }

  const entries = await buildCatalog()
  if (entries.length > 0) {
    try {
      await mkdir(path.dirname(CACHE_FILE), { recursive: true })
      await writeFile(CACHE_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), entries }))
    } catch {
      // the cache is best-effort; a failed write just means the next lookup rebuilds
    }
  }
  return entries
}

function tokensFor(title: string, brand: string | null): string[] {
  return (brand ? `${brand} ${title}` : title)
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((w) => w.length > 1)
}

async function fetchNaturalGrocersPrice(
  title: string,
  brand: string | null,
  qty: number,
  unit: string | null
): Promise<FetchedPrice | null> {
  const catalog = await getCatalog()
  if (catalog.length === 0) return null

  const tokens = tokensFor(title, brand)
  if (tokens.length === 0) return null

  let best: { entry: CatalogEntry; score: number } | null = null
  for (const entry of catalog) {
    const name = entry.name.toLowerCase()
    const matched = tokens.filter((t) => name.includes(t)).length
    if (matched < tokens.length) continue // every word of brand + title must appear

    let score = matched * 10 - entry.name.length / 100
    if (unit && name.includes(unit.toLowerCase())) score += 5
    if (qty && name.includes(String(qty))) score += 3
    if (!best || score > best.score) best = { entry, score }
  }

  return best ? { price: best.entry.price } : null
}

export const PRICE_FETCHERS: Record<string, PriceFetcher> = {
  "Natural Grocers": fetchNaturalGrocersPrice,
}

export const SUPPORTED_PRICE_STORES = Object.keys(PRICE_FETCHERS)