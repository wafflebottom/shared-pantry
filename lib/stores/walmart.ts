import type { ProductResult, StoreAdapter } from "@/lib/product"
import { dedupeProducts, fetchText, type JsonObj } from "@/lib/stores/http"

// Walmart storefront (Next.js). Proven by probe Oct 25 2026 from Simon's
// home connection: the search page loads (PerimeterX passes from a
// residential IP; it blocks datacenter IPs) and carries every product as
// inline JSON in __NEXT_DATA__ — no separate API call needed, so the
// adapter is a scrape of that blob, Natural Grocers-style.
//
// Flow: fetch /search?q=<term> with a browser UA, parse __NEXT_DATA__,
// read props.pageProps.initialData.searchResult.itemStacks[0].items.
// Each item has `name` (brand + size already embedded) and the price as a
// number in priceInfo.currentPrice.price. The `brand` field is null on
// every item — the brand lives in `productBrand` and in the name itself,
// so the shared name-splitter handles it from the name.
//
// Store: the IP-derived store from the probe is 3533 (Denver, zip 80238).
// The adapter relies on IP geo (the dev server runs on Simon's Mac, so
// that's his home IP); pinning the store explicitly via locGuestData
// cookies is a future hardening if the geo ever drifts.
const SEARCH_BASE = "https://www.walmart.com/search"

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

// The price is a number in priceInfo.currentPrice.price. Fall back to a
// top-level numeric price, then to a "$X.XX" price string, so a shape
// change degrades instead of dropping the item.
function priceOf(item: JsonObj): number | null {
  const priceInfo = item.priceInfo as JsonObj | undefined
  const current = priceInfo?.currentPrice as JsonObj | undefined
  const fromInfo = current?.price
  if (typeof fromInfo === "number" && Number.isFinite(fromInfo)) return fromInfo
  const top = item.price
  if (typeof top === "number" && Number.isFinite(top)) return top
  const str =
    typeof current?.priceString === "string"
      ? current.priceString
      : typeof item.priceString === "string"
        ? item.priceString
        : null
  if (str) {
    const m = str.match(/\$?\s*([\d,]+\.\d{2})/)
    if (m) {
      const n = Number(m[1].replace(/,/g, ""))
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

// A stack entry is a product when it has a name and a price; ad
// placeholders and "see more" cards have neither, and are skipped.
function toProductResult(item: JsonObj): ProductResult | null {
  const name = item.name
  if (typeof name !== "string" || !name.trim()) return null
  const price = priceOf(item)
  if (price == null) return null
  return { name: name.trim(), price }
}

async function searchProducts(query: string): Promise<ProductResult[]> {
  try {
    const html = await fetchText(
      `${SEARCH_BASE}?q=${encodeURIComponent(query)}`,
      BROWSER_HEADERS,
      "Walmart",
      query
    )
    if (!html) return []
    const m = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return []
    let data: JsonObj
    try {
      data = JSON.parse(m[1]) as JsonObj
    } catch {
      return []
    }
    const initialData = (
      (data.props as JsonObj | undefined)?.pageProps as JsonObj | undefined
    )?.initialData as JsonObj | undefined
    const searchResult = initialData?.searchResult as JsonObj | undefined
    const itemStacks = searchResult?.itemStacks
    if (!Array.isArray(itemStacks) || itemStacks.length === 0) return []
    // itemStacks[0] is the main results; [1] is a smaller (sponsored)
    // stack. Only the main results feed the picker.
    const items = (itemStacks[0] as JsonObj | undefined)?.items
    if (!Array.isArray(items)) return []
    const results: ProductResult[] = []
    for (const item of items as JsonObj[]) {
      const r = toProductResult(item)
      if (r) results.push(r)
    }
    return dedupeProducts(results)
  } catch {
    return []
  }
}

export const walmartAdapter: StoreAdapter = {
  searchProducts,
}
