// Test the Sprouts adapter through the real registry path:
// searchStoreProducts -> adapter.searchProducts -> split + package fields.
// Usage: npx tsx scripts/test-sprouts-adapter.ts
import { searchStoreProducts } from "@/lib/price-fetch"

async function main() {
  for (const q of ["Vital Farms eggs", "Organic Valley Whole Milk"]) {
    const results = await searchStoreProducts("Sprouts", q)
    console.log(`\nquery "${q}": ${results.length} results`)
    for (const r of results.slice(0, 6)) {
      console.log(
        `  $${r.price} | ${r.name} | brand=${r.brand} title=${r.title} size=${r.sizeQty} ${r.sizeUnit} -> item ${r.itemQty} ${r.itemUnit}`
      )
    }
  }
}

main()
