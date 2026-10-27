// Probe v11: full Sprouts chain — page cookies -> placements (item IDs)
// -> Items batches (products). Tests cookies-only auth (no x-ic-qp) and
// whether Items tolerates batches of 10.
// Usage: npx tsx scripts/probe-sprouts.ts [query]
import { writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"

const ENDPOINT = "https://shop.sprouts.com/graphql"
const PAGE_URL = "https://shop.sprouts.com/store/sprouts/s?k=eggs"
const PLACEMENTS_HASH =
  "af0e2c206f9e2321bf87aaae31bd4cf7558298e25d09d3daff2548084bbd55bb"
const ITEMS_HASH =
  "9e71beac4c2151e246377e4c892f3898c239abf65ff0423c04cf7bcdf964c8aa"
const SHOP = { shopId: "514439", postalCode: "80209", zoneId: "943" }
const PAGE_VIEW_ID = randomUUID()

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  "x-client-identifier": "web",
  "x-client-user-id": "21498206729404892",
  "x-ic-view-layer": "true",
  "x-page-view-id": PAGE_VIEW_ID,
}

function gqlUrl(operation: string, variables: unknown, hash: string): string {
  const extensions = { persistedQuery: { version: 1, sha256Hash: hash } }
  return (
    `${ENDPOINT}?operationName=${operation}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify(extensions))}`
  )
}

function placementsUrl(query: string): string {
  return gqlUrl(
    "SearchResultsPlacements",
    {
      action: null,
      query,
      pageViewId: PAGE_VIEW_ID,
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
      shopId: SHOP.shopId,
      postalCode: SHOP.postalCode,
      zoneId: SHOP.zoneId,
      first: 4,
    },
    PLACEMENTS_HASH
  )
}

function itemsUrl(ids: string[]): string {
  return gqlUrl(
    "Items",
    { ids, shopId: SHOP.shopId, zoneId: SHOP.zoneId, postalCode: SHOP.postalCode },
    ITEMS_HASH
  )
}

function walkItems(node: unknown, out: Record<string, unknown>[], depth: number) {
  if (depth > 14 || node === null || typeof node !== "object") return
  if (Array.isArray(node)) {
    for (const item of node) walkItems(item, out, depth + 1)
    return
  }
  const obj = node as Record<string, unknown>
  if (obj.__typename === "ItemsItem") {
    out.push(obj)
    return
  }
  for (const value of Object.values(obj)) walkItems(value, out, depth + 1)
}

async function main() {
  const query = process.argv[2] ?? "eggs"
  const pageRes = await fetch(PAGE_URL, { headers: HEADERS })
  await pageRes.text()
  const cookieHeader = pageRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ")
  const headers = { ...HEADERS, Cookie: cookieHeader }
  console.log(`page ${pageRes.status} · cookies: ${cookieHeader ? "yes" : "NO"}`)

  const plRes = await fetch(placementsUrl(query), { headers })
  const plText = await plRes.text()
  console.log(`placements: status ${plRes.status} · ${plText.length} bytes`)
  if (plText.includes("Not Authenticated")) {
    console.log("placements NOT AUTHENTICATED (cookies-only auth failed)")
    return
  }
  const pl = JSON.parse(plText)
  const placements = pl.data.searchResultsPlacements.placements as Record<string, unknown>[]
  const ids: string[] = []
  const seen = new Set<string>()
  for (const p of placements) {
    const content = p.content as Record<string, unknown> | undefined
    const list = content?.itemIds as string[] | undefined
    if (Array.isArray(list)) {
      for (const id of list) {
        if (typeof id === "string" && !seen.has(id)) {
          seen.add(id)
          ids.push(id)
        }
      }
    }
  }
  const inlined: Record<string, unknown>[] = []
  walkItems(pl, inlined, 0)
  console.log(`grids/placements: ${placements.length} · unique itemIds: ${ids.length} · inlined items: ${inlined.length}`)
  console.log(`first 10 ids: ${ids.slice(0, 10).join(", ")}`)

  const BATCH = 10
  const products: Record<string, unknown>[] = [...inlined]
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const res = await fetch(itemsUrl(batch), { headers })
    const text = await res.text()
    if (res.status !== 200 || text.includes("Not Authenticated")) {
      console.log(`Items batch ${i / BATCH + 1} FAILED: status ${res.status} · ${text.slice(0, 200)}`)
      break
    }
    const data = JSON.parse(text)
    if (i === 0) {
      console.log(`Items response top keys: ${Object.keys(data).join(", ")} · data keys: ${Object.keys(data.data ?? {}).join(", ")}`)
      await writeFile("sprouts-items-sample.json", text)
      console.log("first Items response saved to sprouts-items-sample.json")
    }
    const found: Record<string, unknown>[] = []
    walkItems(data, found, 0)
    console.log(`  batch ${i / BATCH + 1} (${batch.length} ids) -> ${found.length} items`)
    products.push(...found)
  }

  const seenNames = new Set<string>()
  console.log(`\nTOTAL products: ${products.length}`)
  for (const p of products) {
    const name = p.name as string | undefined
    const price = (p.price as Record<string, unknown> | undefined)?.viewSection as
      | Record<string, unknown>
      | undefined
    const itemCard = price?.itemCard as Record<string, unknown> | undefined
    const priceString = itemCard?.priceString as string | undefined
    if (name && !seenNames.has(name)) {
      seenNames.add(name)
      console.log(`  ${priceString ?? "(no price)"}  ${name}  [brand: ${p.brandName ?? "?"} · size: ${(p.size as string | undefined) ?? "?"}]`)
    }
  }
}

main()
