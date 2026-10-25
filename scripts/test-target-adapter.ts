// Test the Target adapter through searchStoreProducts (the same path the
// picker and price lookup use). Run: npx tsx scripts/test-target-adapter.ts
import { searchStoreProducts } from "@/lib/price-fetch"

async function main() {
  for (const query of ["Vital Farms eggs", "Organic Valley Whole Milk"]) {
    console.log(`\n=== ${query} ===`)
    const results = await searchStoreProducts("Target", query)
    console.log(`results: ${results.length}`)
    for (const r of results.slice(0, 10)) {
      const size = r.sizeQty != null && r.sizeUnit ? `${r.sizeQty} ${r.sizeUnit}` : "(no size)"
      const qty = r.itemQty != null && r.itemUnit ? `${r.itemQty} ${r.itemUnit}` : "(no qty)"
      const price = r.price == null ? "(no price)" : `$${r.price.toFixed(2)}`
      console.log(
        `- ${r.name} | brand: ${r.brand ?? "?"} | title: ${r.title} | size: ${size} | qty: ${qty} | price: ${price}`
      )
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
