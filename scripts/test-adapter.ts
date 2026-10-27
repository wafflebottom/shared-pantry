// Test every store adapter through the real registry path:
// searchStoreProducts -> adapter.searchProducts -> split + package fields.
// Usage: npx tsx scripts/test-adapter.ts [store]
//   no arg runs all five stores; pass e.g. "Sprouts" to run just one.
// Whole Foods serves catalog data but no prices, so every result reports
// "(no price)" and a pick fills title/brand/size only.
import { searchStoreProducts } from "@/lib/price-fetch"

const ALL_STORES = ["Natural Grocers", "Sprouts", "Target", "Walmart", "Whole Foods"]

async function main() {
  const storeArg = process.argv[2]
  const stores = storeArg ? [storeArg] : ALL_STORES
  for (const store of stores) {
    for (const query of ["Vital Farms eggs", "Organic Valley Whole Milk"]) {
      console.log(`\n=== ${store} — "${query}" ===`)
      const results = await searchStoreProducts(store, query)
      console.log(`results: ${results.length}`)
      for (const r of results.slice(0, 6)) {
        const size =
          r.sizeQty != null && r.sizeUnit ? `${r.sizeQty} ${r.sizeUnit}` : "(no size)"
        const qty =
          r.itemQty != null && r.itemUnit ? `${r.itemQty} ${r.itemUnit}` : "(no qty)"
        const price = r.price == null ? "(no price)" : `$${r.price.toFixed(2)}`
        console.log(
          `- ${r.name} | brand: ${r.brand ?? "?"} | title: ${r.title} | size: ${size} | qty: ${qty} | price: ${price}`
        )
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
