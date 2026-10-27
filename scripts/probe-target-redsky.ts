// Target RedSky probe v3 (HOME IP): 200 but 0 items — dump the response
// structure to find where the products live, and test whether the
// purchasability filter is emptying the results.
// Run: npx tsx scripts/probe-target-redsky.ts
import { writeFile } from "node:fs/promises"

const KEY = "9f36aeafbe60771e321a7cc95a78140772ab3e96" // public key from Target's own frontend
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

async function getCookies(term: string): Promise<{ cookieHeader: string; visitorId: string; pageUrl: string }> {
  const pageUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(term)}`
  const pageRes = await fetch(pageUrl, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
  })
  console.log(`page status: ${pageRes.status}`)
  const setCookies: string[] = (pageRes.headers as any).getSetCookie?.() ?? []
  await pageRes.text()
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ")
  const visitorId = (setCookies.find((c) => c.startsWith("visitorId=")) || "").split(";")[0].split("=")[1] || ""
  return { cookieHeader, visitorId, pageUrl }
}

async function search(
  term: string,
  cookies: { cookieHeader: string; visitorId: string; pageUrl: string },
  opts: { purchasabilityFilter: boolean },
): Promise<{ status: number; text: string }> {
  const params = new URLSearchParams({
    key: KEY,
    keyword: term,
    channel: "WEB",
    count: "24",
    offset: "0",
    page: `/s?searchTerm=${encodeURIComponent(term)}`,
    visitor_id: cookies.visitorId,
    pricing_store_id: "3991",
  })
  if (opts.purchasabilityFilter) params.set("default_purchasability_filter", "true")
  const url = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?${params}`
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", Referer: cookies.pageUrl, Cookie: cookies.cookieHeader },
  })
  const text = await res.text()
  return { status: res.status, text }
}

function itemCount(text: string): number {
  try {
    const json = JSON.parse(text)
    const data = json.data ?? json
    const items = data.search_response?.items?.Item ?? data.search_response?.items ?? []
    return Array.isArray(items) ? items.length : -1
  } catch {
    return -1
  }
}

async function main() {
  // Honey: variant A (with purchasability filter) — full structure dump
  console.log(`\n=== honey (with purchasability filter) ===`)
  let cookies = await getCookies("honey")
  let r = await search("honey", cookies, { purchasabilityFilter: true })
  console.log(`redsky status: ${r.status}, bytes: ${r.text.length}, items: ${itemCount(r.text)}`)
  if (r.status === 200) {
    await writeFile("target-redsky-honey.json", r.text)
    console.log(`saved target-redsky-honey.json`)
    const json = JSON.parse(r.text)
    const data = json.data ?? json
    console.log(`data keys: ${Object.keys(data).join(", ")}`)
    const sr = data.search_response
    if (sr && typeof sr === "object") {
      console.log(`search_response keys: ${Object.keys(sr).join(", ")}`)
      for (const k of Object.keys(sr)) {
        const v = (sr as any)[k]
        console.log(`  ${k}: ${Array.isArray(v) ? `array[${v.length}]` : typeof v}`)
      }
    }
    console.log(`raw head: ${r.text.slice(0, 400)}`)
  } else {
    console.log(r.text.slice(0, 300))
  }

  // Honey: variant B (no purchasability filter) — is the filter the cause?
  console.log(`\n=== honey (NO purchasability filter) ===`)
  cookies = await getCookies("honey")
  r = await search("honey", cookies, { purchasabilityFilter: false })
  console.log(`redsky status: ${r.status}, bytes: ${r.text.length}, items: ${itemCount(r.text)}`)
  if (r.status === 200 && itemCount(r.text) > 0) {
    const json = JSON.parse(r.text)
    const data = json.data ?? json
    const products = data.search_response?.items?.Item ?? data.search_response?.items ?? []
    for (const p of (products as any[]).slice(0, 5)) {
      const title = p.item?.product_description?.title ?? "?"
      const brand = p.item?.product_description?.brand ?? "?"
      const price = p.price?.formatted_current_price ?? p.price?.current_retail ?? "?"
      console.log(`- ${title} | brand: ${brand} | price: ${price} | tcin: ${p.tcin ?? "?"}`)
    }
  } else if (r.status !== 200) {
    console.log(r.text.slice(0, 300))
  }

  // Eggs: variant A only
  console.log(`\n=== eggs (with purchasability filter) ===`)
  cookies = await getCookies("eggs")
  r = await search("eggs", cookies, { purchasabilityFilter: true })
  console.log(`redsky status: ${r.status}, bytes: ${r.text.length}, items: ${itemCount(r.text)}`)
  console.log("\nProbe done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
