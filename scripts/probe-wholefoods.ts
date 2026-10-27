// Probe v1: Whole Foods price chain from the home connection — no Amazon login.
// Tests whether store context (Washington Park, Denver — wfmStoreId 10373)
// unlocks prices in /api/wwos/products when called from Simon's home IP.
// Deliberately uses NO Amazon session cookies: this probe answers whether the
// adapter can work without his login. If prices stay null here, the wall is
// the Amazon session and Whole Foods stays manual-entry.
// Usage: npx tsx scripts/probe-wholefoods.ts [query]
import { writeFile } from "node:fs/promises"

const BASE = "https://www.wholefoodsmarket.com"
const QUERY = process.argv[2] ?? "eggs"

// Washington Park store cookie, copied from Simon's browser session (Oct 24, 2026).
// Public store info only (store id/name/coords) — no login data.
const STORE_COOKIE =
  "eyJpZCI6IjEwMzczIiwibmFtZSI6Ildhc2hpbmd0b24gUGFyayIsInRsYyI6IndzcCIsInBhdGgiOiJ3c3AiLCJzdGF0ZSI6IkNPIiwic3RvcmVfbmlkIjoiIiwic3RhcnRfZGF0ZSI6IjIwMjYtMTAtMjRUMTg6MzQ6NTYuNjEwWiIsInVwZGF0ZWRfZGF0ZSI6IjIwMjYtMTAtMjRUMTg6MzQ6NTYuNjEwWiIsImdlb21ldHJ5Ijp7ImNvb3JkaW5hdGVzIjpbLTEwNC45Nzk3NCwzOS42OTU4XSwidHlwZSI6IlBvaW50In19"
const STORE_ID = "10373"
const ZIP = "80219"

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
}

async function get(path: string, headers: Record<string, string> = HEADERS) {
  const res = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(30000) })
  const text = await res.text()
  return { status: res.status, text, cookies: res.headers.getSetCookie() }
}

async function post(path: string, body: unknown, headers: Record<string, string> = HEADERS) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  return { status: res.status, text, cookies: res.headers.getSetCookie() }
}

function cookieHeader(cookies: string[]): string {
  return cookies
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ")
}

function showProducts(label: string, text: string): boolean {
  let hasPrice = false
  try {
    const products = JSON.parse(text) as Record<string, unknown>[]
    for (const p of products) {
      const offer = p.offerDetails as Record<string, unknown> | null
      const offerStr = offer ? JSON.stringify(offer).slice(0, 400) : "null"
      if (offer) hasPrice = true
      console.log(`  ${p.name as string}`)
      console.log(`    brand: ${p.brandName as string} · offerDetails: ${offerStr}`)
      console.log(`    availability: ${JSON.stringify(p.availability)?.slice(0, 200) ?? "null"}`)
    }
  } catch {
    console.log(`  (could not parse products response: ${text.slice(0, 200)})`)
  }
  console.log(`  => ${label}: prices ${hasPrice ? "VISIBLE ✓" : "null ✗"}`)
  return hasPrice
}

async function main() {
  console.log(`query: "${QUERY}" · store: Washington Park ${STORE_ID} · zip ${ZIP}\n`)

  // 1. Search — control step, works from anywhere.
  const search = await get(
    `/api/wwos/rsi/search?text=${encodeURIComponent(QUERY)}&old=${encodeURIComponent(QUERY)}&size=30&offset=0&programType=grocery`
  )
  console.log(`1. search: status ${search.status} · ${search.text.length} bytes`)
  let asins: string[] = ["B074H5SRLB", "B00M1QWODW", "B01MZHDHVM"]
  try {
    const data = JSON.parse(search.text)
    const results = data.mainResultSet?.searchResults as { asin: string }[] | undefined
    if (results?.length) {
      asins = results.slice(0, 3).map((r) => r.asin)
      console.log(`   ASINs: ${asins.join(", ")} (${results.length} on page)`)
    }
  } catch {
    console.log("   (search parse failed, using fixed egg ASINs)")
  }
  const asinsParam = asins.join(",")

  // 2. IP-derived zip — from home this should be a Denver zip.
  const zipGet = await get("/api/wwos/location/zip")
  console.log(`2. GET location/zip (IP-derived): status ${zipGet.status} · ${zipGet.text.slice(0, 100)}`)

  // 3-6. Products under four store-context conditions.
  const variants: { label: string; path: string; headers?: Record<string, string> }[] = [
    { label: "3. products, no store context (control)", path: `/api/wwos/products?asins=${asinsParam}` },
    {
      label: "4. products + wfm_store_d8 cookie",
      path: `/api/wwos/products?asins=${asinsParam}`,
      headers: { ...HEADERS, Cookie: `wfm_store_d8=${STORE_COOKIE}` },
    },
    {
      label: "5. products + wfmStoreId param",
      path: `/api/wwos/products?asins=${asinsParam}&wfmStoreId=${STORE_ID}`,
    },
    {
      label: "6. products + cookie + param",
      path: `/api/wwos/products?asins=${asinsParam}&wfmStoreId=${STORE_ID}`,
      headers: { ...HEADERS, Cookie: `wfm_store_d8=${STORE_COOKIE}` },
    },
  ]
  let unlocked = ""
  for (const v of variants) {
    console.log(v.label)
    const res = await get(v.path, v.headers)
    console.log(`   status ${res.status} · ${res.text.length} bytes`)
    if (showProducts(v.label, res.text) && !unlocked) {
      unlocked = v.label
      await writeFile("wholefoods-products-sample.json", res.text)
      console.log("   sample saved to wholefoods-products-sample.json")
    }
  }

  // 7. Set zip explicitly — 403 from the VM, the key IP-gating test.
  const zipPost = await post("/api/wwos/location/zip", { zipCode: ZIP })
  console.log(`7. POST location/zip {${ZIP}}: status ${zipPost.status} · ${zipPost.text.slice(0, 200)}`)

  // 8. Closest store — if this works from home, the adapter can mint store context itself.
  const closest = await post("/api/wwos/location/store/closest", { zipCode: ZIP, programType: "grocery" })
  console.log(`8. POST location/store/closest: status ${closest.status} · ${closest.text.slice(0, 300)}`)

  // 9. If closest-store worked, replay its cookies on products.
  if (closest.status === 200) {
    const jar = cookieHeader(closest.cookies)
    console.log(`9. products + closest-store cookies (${jar ? "cookies set" : "no cookies"}):`)
    const res = await get(
      `/api/wwos/products?asins=${asinsParam}`,
      jar ? { ...HEADERS, Cookie: jar } : HEADERS
    )
    console.log(`   status ${res.status} · ${res.text.length} bytes`)
    if (showProducts("9. products + closest-store cookies", res.text) && !unlocked) {
      unlocked = "9. products + closest-store cookies"
      await writeFile("wholefoods-products-sample.json", res.text)
      console.log("   sample saved to wholefoods-products-sample.json")
    }
  } else {
    console.log("9. skipped (closest-store did not return 200)")
  }

  console.log(
    `\nVERDICT: prices ${
      unlocked
        ? `UNLOCKED by ${unlocked}`
        : "STILL NULL everywhere — wall is the Amazon login, Whole Foods stays manual-entry"
    }`
  )
}

main()
