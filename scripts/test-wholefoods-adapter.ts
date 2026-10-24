// Test the Whole Foods adapter through the real registry path:
// searchStoreProducts -> adapter.searchProducts -> split + package fields.
// Whole Foods serves catalog data but no prices, so every result reports
// "(no price)" and a pick fills title/brand/size only.
// Usage: npx tsx scripts/test-wholefoods-adapter.ts
import { searchStoreProducts } from "@/lib/price-fetch"

async function main() {
  for (const q of ["Vital Farms eggs", "Organic Valley Whole Milk"]) {
    const results = await searchStoreProducts("Whole Foods", q)
    console.log(`\nquery "${q}": ${results.length} results`)
    for (const r of results.slice(0, 6)) {
      const price = r.price != null ? `$${r.price}` : "(no price)"
      console.log(
        `  ${price} | ${r.name} | brand=${r.brand} title=${r.title} size=${r.sizeQty} ${r.sizeUnit} -> item ${r.itemQty} ${r.itemUnit}`
      )
    }
  }
}

main()
