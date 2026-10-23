// Offline analysis of the ng-probe.html saved by probe-prices.ts.
// Usage: npx tsx scripts/analyze-probe.ts

import { readFileSync } from "node:fs"

const html = readFileSync("ng-probe.html", "utf8")
const lower = html.toLowerCase()

function contexts(term: string, shown = 5, span = 220) {
  const t = term.toLowerCase()
  const positions: number[] = []
  let idx = 0
  while (true) {
    const i = lower.indexOf(t, idx)
    if (i === -1) break
    positions.push(i)
    idx = i + t.length
  }
  console.log(`\n"${term}": ${positions.length} occurrence(s)`)
  for (const i of positions.slice(0, shown)) {
    console.log(`  …${html.slice(Math.max(0, i - 60), i + span).replace(/\s+/g, " ")}…`)
  }
}

contexts("organic valley")
contexts("whole milk")

const nameFields = [...html.matchAll(/"name":"([^"]{0,90})"/g)]
  .map((m) => m[1])
  .filter((n) => /milk/i.test(n))
  .slice(0, 10)
console.log(`\nproduct "name" fields mentioning milk: ${nameFields.length ? nameFields.join(" | ") : "(none)"}`)

const centPrices = [...html.matchAll(/"price":\s*(\d{2,6})/g)].length
console.log(`"price": <integer> (cents-style) occurrences: ${centPrices}`)

const displayPrices = [...html.matchAll(/"displayPrice":"([^"]+)"/g)].slice(0, 5).map((m) => m[1])
console.log(`"displayPrice" samples: ${displayPrices.length ? displayPrices.join(" · ") : "(none)"}`)

const urls = [
  ...new Set(
    [...html.matchAll(/https?:\/\/[^"'\s\\]+/g)]
      .map((m) => m[0])
      .filter((u) => /search|api|graphql/i.test(u))
  ),
].slice(0, 15)
console.log("\nURLs mentioning search/api/graphql:")
for (const u of urls) console.log(`  ${u.slice(0, 160)}`)
if (urls.length === 0) console.log("  (none)")
