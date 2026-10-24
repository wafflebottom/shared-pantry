import { randomUUID } from "node:crypto"
import type { ProductResult, StoreAdapter } from "@/lib/product"

// Sprouts storefront (Instacart Platform). Simon's Denver store, captured
// from his own browser session: shopId 514439, postalCode 80209, zoneId 943.
// To use a different store, search on the site in a browser and copy the
// shopId/postalCode/zoneId triple from a SearchResultsPlacements request.
const SPROUTS_SHOP_ID = "514439"
const SPROUTS_POSTAL_CODE = "80209"
const SPROUTS_ZONE_ID = "943"

const GRAPHQL_ENDPOINT = "https://shop.sprouts.com/graphql"
const STOREFRONT_SEARCH_PAGE = "https://shop.sprouts.com/store/sprouts/s"

// Apollo persisted queries: requests carry only the SHA-256 hash of the
// query document, replayed verbatim here (captured from Simon's browser).
const PLACEMENTS_HASH =
  "af0e2c206f9e2321bf87aaae31bd4cf7558298e25d09d3daff2548084bbd55bb"
const ITEMS_HASH =
  "9e71beac4c2151e246377e4c892f3898c239abf65ff0423c04cf7bcdf964c8aa"

// The store's own ranking puts the match for a targeted "Brand Title" query
// near the top, and each resolved id costs one slot in a batched Items call.
// Resolving only the first N ids keeps a lookup run cheap (N=60 -> 6 calls)
// while keeping every plausible match in play.
const MAX_IDS_TO_RESOLVE = 60
const ITEMS_BATCH_SIZE = 10

// Headers proven by probe: the page-minted cookies (below) are the auth;
// x-client-user-id is the stable guest id seen in every capture.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  "x-client-identifier": "web",
  "x-client-user-id": "21498206729404892",
  "x-ic-view-layer": "true",
}

type JsonObj = Record<string, unknown>

function gqlUrl(operation: string, variables: unknown, hash: string): string {
  const extensions = { persistedQuery: { version: 1, sha256Hash: hash } }
  return (
    `${GRAPHQL_ENDPOINT}?operationName=${operation}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify(extensions))}`
  )
}

function placementsUrl(query: string, pageViewId: string): string {
  return gqlUrl(
    "SearchResultsPlacements",
    {
      action: null,
      query,
      pageViewId,
      elevatedProductId: null,
      searchSource: "search",
      filters: [],
      disableReformulation: false,
      disableLlm: false,
      forceInspiration: false,
      orderBy: "bestMatch",
      clusterId: null,
      includeDebugInfo: false,
      clusteringStrategy: null,
      contentManagementSearchParams: { itemGridColumnCount: 2 },
      shopId: SPROUTS_SHOP_ID,
      postalCode: SPROUTS_POSTAL_CODE,
      zoneId: SPROUTS_ZONE_ID,
      first: 4,
    },
    PLACEMENTS_HASH
  )
}

function itemsUrl(ids: string[]): string {
  return gqlUrl(
    "Items",
    {
      ids,
      shopId: SPROUTS_SHOP_ID,
      zoneId: SPROUTS_ZONE_ID,
      postalCode: SPROUTS_POSTAL_CODE,
    },
    ITEMS_HASH
  )
}

async function getText(url: string, headers: Record<string, string>): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// The storefront mints its guest session in the Set-Cookie of an ordinary
// page response. Harvest those cookies; they authenticate the GraphQL calls.
async function mintCookieHeader(
  query: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const res = await fetch(
      `${STOREFRONT_SEARCH_PAGE}?k=${encodeURIComponent(query)}`,
      { headers, cache: "no-store" }
    )
    await res.text()
    const cookieHeader = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ")
    return cookieHeader || null
  } catch {
    return null
  }
}

// Collect the grid item ids (deduped, in store-ranked order) plus any items
// already inlined in the placements response.
function collectFromPlacements(data: JsonObj): { ids: string[]; inlined: JsonObj[] } {
  const placements = (data.data as JsonObj | undefined)?.searchResultsPlacements as
    | JsonObj
    | undefined
  const list = (placements?.placements as JsonObj[] | undefined) ?? []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const p of list) {
    const content = p.content as JsonObj | undefined
    const itemIds = content?.itemIds as unknown
    if (!Array.isArray(itemIds)) continue
    for (const id of itemIds) {
      if (typeof id === "string" && !seen.has(id)) {
        seen.add(id)
        ids.push(id)
      }
    }
  }
  const inlined: JsonObj[] = []
  const walk = (node: unknown, depth: number): void => {
    if (depth > 14 || node === null || typeof node !== "object") return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    const obj = node as JsonObj
    if (obj.__typename === "ItemsItem") {
      inlined.push(obj)
      return
    }
    for (const value of Object.values(obj)) walk(value, depth + 1)
  }
  walk(data, 0)
  return { ids, inlined }
}

// A priceString like "$10.99" or "$0.62 each (est.)" -> the leading amount.
function parsePriceString(value: unknown): number | null {
  if (typeof value !== "string") return null
  const m = value.match(/\$([\d,]+(?:\.\d+)?)/)
  if (!m) return null
  const price = Number(m[1].replace(/,/g, ""))
  return Number.isFinite(price) ? price : null
}

// Sprouts names carry no size; the size field holds it ("18 ct", "0.5 gal",
// "1 each"). Appending it in parentheses lets the shared split/match code
// work exactly as it does for Natural Grocers names.
function toProductResult(item: JsonObj): ProductResult | null {
  const name = item.name
  if (typeof name !== "string" || !name) return null
  const priceObj = item.price as JsonObj | undefined
  const viewSection = priceObj?.viewSection as JsonObj | undefined
  const itemCard = viewSection?.itemCard as JsonObj | undefined
  const price = parsePriceString(itemCard?.priceString)
  if (price === null) return null
  const size = item.size
  const fullName =
    typeof size === "string" && size ? `${name} (${size})` : name
  return { name: fullName, price }
}

async function searchProducts(query: string): Promise<ProductResult[]> {
  try {
    const pageViewId = randomUUID()
    const headers = { ...BROWSER_HEADERS, "x-page-view-id": pageViewId }
    let cookieHeader = await mintCookieHeader(query, headers)
    if (!cookieHeader) return []
    let authed = { ...headers, Cookie: cookieHeader }

    let text = await getText(placementsUrl(query, pageViewId), authed)
    // A stale session 401s with "Not Authenticated" wrapped in a 200;
    // re-mint once and retry before giving up.
    if (text !== null && text.includes("Not Authenticated")) {
      cookieHeader = await mintCookieHeader(query, headers)
      if (!cookieHeader) return []
      authed = { ...headers, Cookie: cookieHeader }
      text = await getText(placementsUrl(query, pageViewId), authed)
    }
    if (text === null) return []
    const placementsData = JSON.parse(text) as JsonObj
    const { ids, inlined } = collectFromPlacements(placementsData)

    const results: ProductResult[] = []
    const seenNames = new Set<string>()
    const push = (item: JsonObj): void => {
      const r = toProductResult(item)
      if (r && !seenNames.has(r.name)) {
        seenNames.add(r.name)
        results.push(r)
      }
    }
    for (const item of inlined) push(item)

    const toResolve = ids.slice(0, MAX_IDS_TO_RESOLVE)
    for (let i = 0; i < toResolve.length; i += ITEMS_BATCH_SIZE) {
      const batch = toResolve.slice(i, i + ITEMS_BATCH_SIZE)
      const batchText = await getText(itemsUrl(batch), authed)
      if (batchText === null) continue
      const batchData = JSON.parse(batchText) as JsonObj
      const items = (batchData.data as JsonObj | undefined)?.items
      if (!Array.isArray(items)) continue
      for (const item of items as JsonObj[]) push(item)
    }
    return results
  } catch {
    return []
  }
}

export const sproutsAdapter: StoreAdapter = {
  searchProducts,
}
