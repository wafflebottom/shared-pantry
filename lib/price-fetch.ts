import {
  packageFieldsFor,
  splitProductName,
  type ProductResult,
  type SplitProductName,
  type StoreAdapter,
} from "@/lib/product"
import { bestMatch } from "@/lib/matching"
import { naturalGrocersAdapter } from "@/lib/stores/natural-grocers"
import { sproutsAdapter } from "@/lib/stores/sprouts"
import { targetAdapter } from "@/lib/stores/target"
import { wholeFoodsAdapter } from "@/lib/stores/whole-foods"



export type FetchedPrice = { price: number; unit?: string | null }

type PriceFetcher = (
  title: string,
  brand: string | null,
  qty: number,
  unit: string | null
) => Promise<FetchedPrice | null>

// Store display name (as stored on a list) -> that store's adapter. Adding
// a store is one new adapter file in lib/stores/ plus one line here; the
// actions, matching, and UI never change.
const STORE_ADAPTERS: Record<string, StoreAdapter> = {
  "Natural Grocers": naturalGrocersAdapter,
  Sprouts: sproutsAdapter,
  Target: targetAdapter,
  "Whole Foods": wholeFoodsAdapter,
}

// Generic lookup: search the store for "Brand Title", pick the best match;
// if the adapter offers a catalog and search found nothing, match there.
// A null-priced match is not a price — only a real number gets booked.
function makePriceFetcher(adapter: StoreAdapter): PriceFetcher {
  return async (title, brand, qty, unit) => {
    const query = `${brand ?? ""} ${title}`.replace(/\s+/g, " ").trim()
    const results = await adapter.searchProducts(query)
    const fromSearch = bestMatch(results, title, brand, qty, unit)
    if (fromSearch && fromSearch.price != null) return { price: fromSearch.price }
    if (adapter.getCatalog) {
      const catalog = await adapter.getCatalog()
      const fromCatalog = bestMatch(catalog, title, brand, qty, unit)
      if (fromCatalog && fromCatalog.price != null) return { price: fromCatalog.price }
    }
    return null
  }
}

// Price lookup runs only for stores whose adapters serve prices. A
// search-only store (Whole Foods) is in STORE_ADAPTERS for the picker but
// gets no fetcher, so Lookup Prices silently skips its lists.
export const PRICE_FETCHERS: Record<string, PriceFetcher> = Object.fromEntries(
  Object.entries(STORE_ADAPTERS)
    .filter(([, adapter]) => adapter.servesPrices !== false)
    .map(([store, adapter]) => [store, makePriceFetcher(adapter)])
)

export const SUPPORTED_PRICE_STORES = Object.keys(PRICE_FETCHERS)

// Every store with an adapter, priced or not — this is what gates the
// picker search section.
export const SUPPORTED_SEARCH_STORES = Object.keys(STORE_ADAPTERS)

// A store product enriched for the picker UI: the raw name/price, the
// brand/title/size split, and ready-to-use item qty/unit fields.
export type PickerProduct = ProductResult &
  SplitProductName & { itemQty: number | null; itemUnit: string | null }

// Raw product search for the picker UI. The UI calls this through a server
// action and never knows which store produced the results.
export async function searchStoreProducts(
  store: string,
  query: string
): Promise<PickerProduct[]> {
  const adapter = STORE_ADAPTERS[store]
  if (!adapter) return []
  const results = await adapter.searchProducts(query)
  return results.map((r) => {
    const split = splitProductName(r.name)
    const pkg =
      split.sizeQty != null && split.sizeUnit
        ? packageFieldsFor(split.sizeQty, split.sizeUnit)
        : null
    return {
      ...r,
      ...split,
      itemQty: pkg?.qty ?? null,
      itemUnit: pkg?.unit ?? null,
    }
  })
}
