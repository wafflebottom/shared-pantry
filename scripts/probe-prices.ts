// Probe v4: parser with JSON-unescape + storefront category discovery.
// Usage: npx tsx scripts/probe-prices.ts

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
}

type Pair = { name: string; price: number }

function parseItemPrices(html: string): Pair[] {
  const clean = html.replace(/\\"/g, '"').replace(/\\u0022/gi, '"')
  const pairs: Pair[] = []
  const seen = new Set<string>()
  const re = /"item_name":"([^"]+)"[\s\S]{0,400}?"display_string":"\$(\d+\.\d{2})"/g
  for (const m of clean.matchAll(re)) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    pairs.push({ name: m[1], price: Number(m[2]) })
  }
  return pairs
}

async function main() {
  // Control: the known dairy category
  const catUrl = "https://shop.naturalgrocers.com/category/dairy%20%26%20eggs-960"
  const res = await fetch(catUrl, { headers: HEADERS })
  const html = await res.text()
  const pairs = parseItemPrices(html)
  console.log(`\ncontrol: dairy category`)
  console.log(`  status ${res.status} · ${html.length} bytes · ${pairs.length} item/price pairs`)
  for (const p of pairs.slice(0, 6)) console.log(`    ${p.name} — $${p.price.toFixed(2)}`)
  for (const p of pairs.filter((p) => /organic valley whole milk/i.test(p.name))) {
    console.log(`  ★ TEST ITEM: ${p.name} — $${p.price.toFixed(2)}`)
  }

  // Category discovery from the storefront home page
  const home = await fetch("https://shop.naturalgrocers.com/", { headers: HEADERS })
  const homeHtml = await home.text()
  const cats = [
    ...new Set(
      [...homeHtml.matchAll(/\/category\/[a-z0-9%&\-]+/gi)].map((m) => m[0])
    ),
  ]
  console.log(`\nstorefront categories found: ${cats.length}`)
  for (const c of cats) console.log(`  ${c}`)
}

main()