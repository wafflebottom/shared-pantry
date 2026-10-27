// Diagnose Walmart 0-results after the robustness refactor.
// Usage: npx tsx scripts/probe-walmart-diagnose.ts
// Reports timing, status, bytes, __NEXT_DATA__ presence, itemStacks shape,
// and the adapter result — so we can tell a timeout / block / parse change apart.
import { searchStoreProducts } from "@/lib/price-fetch"

const URL = "https://www.walmart.com/search?q=Vital%20Farms%20eggs"
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

async function main() {
  // 1. Raw fetch with a generous 30s timeout, timed.
  const t0 = Date.now()
  try {
    const res = await fetch(URL, { headers: HEADERS, signal: AbortSignal.timeout(30000) })
    const ms = Date.now() - t0
    console.log(`raw fetch: status=${res.status} ms=${ms}`)
    const html = await res.text()
    console.log(`raw fetch: bytes=${html.length}`)
    console.log(`has __NEXT_DATA__: ${html.includes("__NEXT_DATA__")}`)
    console.log(`has PerimeterX/block markers: ${/PerimeterX|Robot or human|blocked/i.test(html)}`)
    const m = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)
    console.log(`__NEXT_DATA__ script match: ${m ? "yes" : "no"}`)
    if (m) {
      try {
        const data = JSON.parse(m[1]) as any
        const stacks = data?.props?.pageProps?.initialData?.searchResult?.itemStacks
        console.log(`itemStacks: ${Array.isArray(stacks) ? stacks.length : typeof stacks}`)
        if (Array.isArray(stacks)) {
          stacks.forEach((s: any, i: number) =>
            console.log(`  stack[${i}].items: ${Array.isArray(s?.items) ? s.items.length : typeof s?.items}`)
          )
          const first = stacks[0]?.items?.[0]
          if (first) console.log(`  first item keys: ${Object.keys(first).join(", ")}`)
        }
      } catch (e) {
        console.log(`__NEXT_DATA__ JSON parse failed: ${e instanceof Error ? e.message : e}`)
      }
    }
  } catch (e) {
    console.log(`raw fetch FAILED ms=${Date.now() - t0}: ${e instanceof Error ? `${e.name}: ${e.message}` : e}`)
  }

  // 2. The adapter itself (8s timeout via shared helper), timed.
  const t1 = Date.now()
  const results = await searchStoreProducts("Walmart", "Vital Farms eggs")
  console.log(`adapter: results=${results.length} ms=${Date.now() - t1}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

export {}
