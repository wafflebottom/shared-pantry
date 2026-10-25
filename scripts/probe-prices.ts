// Probe v5: validate the storefront SEARCH route with the proven parser.
// Usage: npx tsx scripts/probe-prices.ts
export {} // module scope: keeps this file's `main` out of the global scope

const STORE_ID = "48664081"

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

async function check(term: string) {
  const url = `https://shop.naturalgrocers.com/convenience/store/${STORE_ID}/search/${encodeURIComponent(term)}?attr_src=home&disable_spell_check=false`
  try {
    const res = await fetch(url, { headers: HEADERS })
    const html = await res.text()
    const pairs = parseItemPrices(html)
    console.log(`\nsearch "${term}"`)
    console.log(`  status ${res.status} · ${html.length} bytes · ${pairs.length} item/price pairs`)
    for (const p of pairs.slice(0, 8)) console.log(`    ${p.name} — $${p.price.toFixed(2)}`)
    return pairs.length
  } catch (err) {
    console.log(`\nsearch "${term}"\n  FETCH FAILED: ${err instanceof Error ? err.message : String(err)}`)
    return 0
  }
}

async function main() {
  await check("contented hen eggs")
  await check("organic valley whole milk")
  await check("eggs")
}

main()
