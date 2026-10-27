// Probe: does target.com serve server-rendered prices a plain fetch can
// parse, and is there structured price data in the raw HTML?
// Run: npx tsx scripts/probe-target.ts
import { writeFile } from "node:fs/promises"

const TERMS = ["honey", "eggs", "milk"]

function snippet(html: string, needle: string, len = 200): string {
  const i = html.indexOf(needle)
  if (i === -1) return "(not found)"
  return html.slice(Math.max(0, i - 40), i + len).replace(/\s+/g, " ")
}

async function main() {
  for (const term of TERMS) {
    const url = `https://www.target.com/s?searchTerm=${encodeURIComponent(term)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
    const html = await res.text()
    console.log(`\n=== ${term} ===`)
    console.log(`status: ${res.status}, bytes: ${html.length}`)
    console.log(`"$" occurrences: ${(html.match(/\$/g) || []).length}`)
    for (const key of ["__NEXT_DATA__", "currentPrice", "formattedCurrentPrice", "application/ld+json", "redsky", "plp_search"]) {
      console.log(`  ${key}: ${html.includes(key) ? "YES" : "no"}`)
    }
    const prices = [...html.matchAll(/\$(\d+\.\d{2})/g)].slice(0, 8).map((m) => m[0])
    console.log(`  sample prices: ${prices.join(", ") || "(none)"}`)
    console.log(`  around "currentPrice": ${snippet(html, "currentPrice")}`)

    if (term === TERMS[0]) {
      await writeFile("target-probe-honey.html", html)
      console.log(`  saved target-probe-honey.html (${html.length} bytes)`)
      const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
      if (nd) {
        await writeFile("target-probe-nextdata.json", nd[1])
        console.log(`  saved target-probe-nextdata.json (${nd[1].length} bytes)`)
      } else {
        console.log(`  no __NEXT_DATA__ script tag found`)
      }
    }
    // Be polite: small pause between requests
    await new Promise((r) => setTimeout(r, 500))
  }
  console.log("\nProbe done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
