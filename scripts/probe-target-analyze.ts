// Analyze the saved Target search HTML: is it a shell, where does the
// product data come from, and is the RedSky API key embedded?
// Run: npx tsx scripts/probe-target-analyze.ts
import { readFile, writeFile } from "node:fs/promises"

async function main() {
  const html = await readFile("target-probe-honey.html", "utf8")
  console.log(`size: ${html.length} bytes`)

  const title = html.match(/<title>([^<]*)<\/title>/)
  console.log(`title: ${title ? title[1] : "(none)"}`)

  for (const marker of ["captcha", "verify you are human", "Access Denied", "Akamai", "robot", "challenge", "Please verify"]) {
    if (html.toLowerCase().includes(marker.toLowerCase())) console.log(`CHALLENGE MARKER: ${marker}`)
  }
  console.log(`challenge markers: (none printed above = clean shell)`)

  // __NEXT_DATA__ with a loose tag match (attributes may vary)
  const nd = html.match(/<script[^>]*__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)
  if (nd) {
    console.log(`__NEXT_DATA__ script: ${nd[1].length} bytes`)
    console.log(`  contains "price": ${nd[1].includes("price")}`)
    console.log(`  contains "tcin": ${nd[1].includes("tcin")}`)
    await writeFile("target-probe-nextdata.json", nd[1])
    console.log(`  saved target-probe-nextdata.json`)
  } else {
    console.log(`__NEXT_DATA__ script tag: NOT FOUND (string appears elsewhere)`)
    const i = html.indexOf("__NEXT_DATA__")
    console.log(`  first occurrence context: ${html.slice(Math.max(0, i - 80), i + 120).replace(/\s+/g, " ")}`)
  }

  // RedSky URLs embedded in the page
  const redskyUrls = [...new Set([...html.matchAll(/https:\/\/redsky\.target\.com[^\s"'<>\\]*/g)].map((m) => m[0]))]
  console.log(`\nredsky URLs found: ${redskyUrls.length}`)
  for (const u of redskyUrls.slice(0, 5)) console.log(`  ${u.slice(0, 220)}`)

  // plp_search contexts
  const plpIdx = [...html.matchAll(/plp_search/g)].map((m) => m.index ?? 0)
  console.log(`\nplp_search occurrences: ${plpIdx.length}`)
  for (const i of plpIdx.slice(0, 3)) {
    console.log(`  ...${html.slice(Math.max(0, i - 60), i + 160).replace(/\s+/g, " ")}...`)
  }

  // API key near redsky
  const keys = [...new Set([...html.matchAll(/key=([A-Za-z0-9_-]{8,})/g)].map((m) => m[1]))]
  console.log(`\nkey= values found: ${keys.length}`)
  for (const k of keys.slice(0, 5)) console.log(`  ${k}`)

  console.log(`\n"tcin" occurrences: ${(html.match(/tcin/g) || []).length}`)
  console.log(`"formattedCurrentPrice" occurrences: ${(html.match(/formattedCurrentPrice/g) || []).length}`)

  // Rough body text: strip tags, first product-ish text
  const body = html.split("<body")[1] || ""
  const text = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  console.log(`\nbody text (first 400 chars): ${text.slice(0, 400)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
