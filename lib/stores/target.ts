import { SIZE_UNIT_PATTERN, type ProductResult, type StoreAdapter } from "@/lib/product"
import {
  cookiesToHeader,
  dedupeProducts,
  fetchWithTimeout,
  logAdapterFailure,
  type JsonObj,
} from "@/lib/stores/http"

// Target storefront (RedSky API). Proven by probe Oct 24 2026 from Simon's
// home connection: the search page is a shell, so the adapter replays the
// same RedSky search the site's own frontend calls.
//
// Flow: fetch the search page, harvest its Set-Cookie (including the
// PerimeterX _pxhd cookie), then call plp_search_v2 with those cookies.
// From a home/residential IP PerimeterX passes every time; from a
// datacenter IP it blocks flakily (HTTP 435), so a 435 here re-mints
// cookies once and retries before giving up.
const REDSKY_BASE = "https://redsky.target.com"
const REDSKY_SEARCH_PATH = "/redsky_aggregations/v1/web/plp_search_v2"
// Public production key, embedded in Target's own frontend bundle (its
// bootstrap payload) — it is how the site authenticates its own calls.
const REDSKY_KEY = "9f36aeafbe60771e321a7cc95a78140772ab3e96"
// Target's default/online pricing store. The page cookies also carry the
// nearest store (sddStore DSI) — a future option for in-store prices.
const PRICING_STORE_ID = "3991"
const SEARCH_PAGE = "https://www.target.com/s"

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Target titles put the brand last ("Pure Clover Honey - 12oz - Good & Gather")
// and the size mid-title ("... - 12oz - ..."). The shared split/match code
// wants "Brand Title (size)", so the adapter normalizes to that shape:
// decode entities, drop the trailing " - Brand" suffix, move a trailing
// " - <size>" into parentheses, and prefix the brand when it isn't one
// already. Names that already start with the brand are left alone.
function toProductName(rawTitle: string, brand: string | null): string {
  let title = decodeHtmlEntities(rawTitle).trim()
  if (brand) {
    // Also tolerate a trailing note after the brand, e.g.
    // " - Good & Gather (Packaging May Vary)" — but never strip a
    // parenthetical that holds the size, e.g. " - Brand (12ct)".
    const suffix = new RegExp(
      `\\s*-\\s*${escapeRegExp(brand)}™?\\s*(\\((?!\\d+(?:\\.\\d+)?\\s*(?:${SIZE_UNIT_PATTERN})\\))[^)]*\\))?\\s*$`,
      "i"
    )
    title = title.replace(suffix, "").trim()
  }
  // "Title - 12oz" -> "Title (12oz)" so the shared size parser sees a
  // trailing size instead of a dangling dash.
  title = title
    .replace(
      new RegExp(
        `\\s*-\\s*(\\d+(?:\\.\\d+)?\\s*(?:${SIZE_UNIT_PATTERN}))\\s*$`,
        "i"
      ),
      " ($1)"
    )
    .trim()
  if (brand && !title.toLowerCase().startsWith(brand.toLowerCase())) {
    title = `${brand} ${title}`
  }
  return title
}

// A RedSky product: price is a number (current_retail), the brand is a
// clean separate field (primary_brand.name), the size rides in the title.
// One malformed title (e.g. an out-of-range HTML entity, which makes
// String.fromCodePoint throw) skips just that item instead of emptying
// the whole search.
function toProductResult(item: JsonObj): ProductResult | null {
  try {
    const itemObj = item.item as JsonObj | undefined
    const productDesc = itemObj?.product_description as JsonObj | undefined
    const rawTitle = productDesc?.title
    if (typeof rawTitle !== "string" || !rawTitle) return null
    const priceObj = item.price as JsonObj | undefined
    const price = priceObj?.current_retail
    if (typeof price !== "number" || !Number.isFinite(price)) return null
    const primaryBrand = itemObj?.primary_brand as JsonObj | undefined
    const brand =
      typeof primaryBrand?.name === "string"
        ? decodeHtmlEntities(primaryBrand.name)
        : null
    return { name: toProductName(rawTitle, brand), price }
  } catch {
    return null
  }
}

// The search page mints the guest session in its Set-Cookie, including the
// PerimeterX cookie the RedSky call needs. Returns the cookie header plus
// the visitor id the API call carries.
async function mintCookies(
  query: string
): Promise<{ cookieHeader: string | null; visitorId: string }> {
  try {
    const res = await fetchWithTimeout(
      `${SEARCH_PAGE}?searchTerm=${encodeURIComponent(query)}`,
      { headers: BROWSER_HEADERS, cache: "no-store" }
    )
    await res.text()
    const cookies = res.headers.getSetCookie()
    const cookieHeader = cookiesToHeader(res)
    const visitorId =
      (cookies.find((c) => c.startsWith("visitorId=")) ?? "")
        .split(";")[0]
        .split("=")[1] ?? ""
    return { cookieHeader, visitorId }
  } catch (e) {
    logAdapterFailure(
      "Target",
      query,
      e instanceof Error ? `${e.name}: ${e.message}` : "fetch error"
    )
    return { cookieHeader: null, visitorId: "" }
  }
}

function searchUrl(query: string, visitorId: string): string {
  // NOTE: no default_purchasability_filter. That flag restricts results to
  // items purchasable from the online store, which excludes perishables
  // entirely — "Vital Farms eggs" returns 0 with it and 41 without it.
  // The adapter wants the catalog and its prices, not a shippable subset.
  const params = new URLSearchParams({
    key: REDSKY_KEY,
    keyword: query,
    channel: "WEB",
    count: "24",
    offset: "0",
    page: `/s?searchTerm=${encodeURIComponent(query)}`,
    pricing_store_id: PRICING_STORE_ID,
  })
  if (visitorId) params.set("visitor_id", visitorId)
  return `${REDSKY_BASE}${REDSKY_SEARCH_PATH}?${params}`
}

async function searchProducts(query: string): Promise<ProductResult[]> {
  try {
    let { cookieHeader, visitorId } = await mintCookies(query)
    if (!cookieHeader) return []
    const pageUrl = `${SEARCH_PAGE}?searchTerm=${encodeURIComponent(query)}`
    const headers = {
      ...BROWSER_HEADERS,
      Accept: "application/json",
      Referer: pageUrl,
      Cookie: cookieHeader,
    }
    let res = await fetchWithTimeout(searchUrl(query, visitorId), {
      headers,
      cache: "no-store",
    })
    // PerimeterX (435) or a stale session: re-mint cookies once and retry
    // before giving up.
    if (res.status === 435 || res.status === 401) {
      const reminted = await mintCookies(query)
      if (!reminted.cookieHeader) return []
      cookieHeader = reminted.cookieHeader
      visitorId = reminted.visitorId
      res = await fetchWithTimeout(searchUrl(query, visitorId), {
        headers: { ...headers, Cookie: cookieHeader },
        cache: "no-store",
      })
    }
    if (!res.ok) {
      logAdapterFailure("Target", query, `HTTP ${res.status}`)
      return []
    }
    const data = (await res.json()) as JsonObj
    const search = (data.data as JsonObj | undefined)?.search as
      | JsonObj
      | undefined
    const list = search?.products
    if (!Array.isArray(list)) return []
    const results: ProductResult[] = []
    for (const item of list as JsonObj[]) {
      const r = toProductResult(item)
      if (r) results.push(r)
    }
    return dedupeProducts(results)
  } catch {
    return []
  }
}

export const targetAdapter: StoreAdapter = {
  searchProducts,
}
