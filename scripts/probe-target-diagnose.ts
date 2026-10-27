// Diagnose "Vital Farms eggs" returning 0 from the Target adapter:
// same params as the adapter, but print the RedSky status + metadata +
// product count. Tests the purchasability filter on/off and a single-word
// control query. Run: npx tsx scripts/probe-target-diagnose.ts
export {} // module scope: keeps this file's `main` out of the global scope
const KEY = "9f36aeafbe60771e321a7cc95a78140772ab3e96"
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

async function mintCookies(query: string) {
  const pageUrl = `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`
  const pageRes = await fetch(pageUrl, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
  })
  console.log(`  page status: ${pageRes.status}`)
  const setCookies: string[] = (pageRes.headers as any).getSetCookie?.() ?? []
  await pageRes.text()
  const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ")
  const visitorId =
    (setCookies.find((c) => c.startsWith("visitorId=")) || "")
      .split(";")[0]
      .split("=")[1] || ""
  return { cookieHeader, visitorId, pageUrl }
}

async function callRedSky(
  query: string,
  cookies: { cookieHeader: string; visitorId: string; pageUrl: string },
  opts: { filter: boolean }
) {
  const params = new URLSearchParams({
    key: KEY,
    keyword: query,
    channel: "WEB",
    count: "24",
    offset: "0",
    page: `/s?searchTerm=${encodeURIComponent(query)}`,
    visitor_id: cookies.visitorId,
    pricing_store_id: "3991",
  })
  if (opts.filter) params.set("default_purchasability_filter", "true")
  const res = await fetch(
    `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?${params}`,
    {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: cookies.pageUrl,
        Cookie: cookies.cookieHeader,
      },
    }
  )
  const text = await res.text()
  console.log(`  redsky status: ${res.status}, bytes: ${text.length}`)
  if (!res.ok) {
    console.log(`  body: ${text.slice(0, 200)}`)
    return
  }
  const json = JSON.parse(text)
  const sr = json.data?.search?.search_response
  const products = json.data?.search?.products ?? []
  console.log(
    `  total_results: ${sr?.metadata?.total_results ?? "?"}, products: ${Array.isArray(products) ? products.length : "?"}`
  )
  if (Array.isArray(products) && products.length) {
    for (const p of products.slice(0, 3)) {
      console.log(
        `    - ${p.item?.product_description?.title ?? "?"} | $${p.price?.current_retail ?? "?"}`
      )
    }
  }
}

async function main() {
  const query = "Vital Farms eggs"
  console.log(`\n=== ${query} (filter ON, adapter params) ===`)
  let cookies = await mintCookies(query)
  await callRedSky(query, cookies, { filter: true })

  console.log(`\n=== ${query} (filter OFF) ===`)
  cookies = await mintCookies(query)
  await callRedSky(query, cookies, { filter: false })

  console.log(`\n=== "eggs" (single word, filter ON) ===`)
  cookies = await mintCookies("eggs")
  await callRedSky("eggs", cookies, { filter: true })

  console.log("\nProbe done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
