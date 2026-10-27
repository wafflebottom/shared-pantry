"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { itemKeyFor } from "@/lib/price-book"
import {
  PRICE_FETCHERS,
  SUPPORTED_SEARCH_STORES,
  searchStoreProducts,
} from "@/lib/price-fetch"
import { formId } from "@/app/actions/helpers"

export async function lookupMissingPrices(formData: FormData) {
  const listTileID = formId(formData, "listTileID")
  if (!listTileID) return null

  const tile = await prisma.listTile.findUnique({
    where: { id: listTileID },
    select: {
      store: true,
      items: { select: { title: true, brand: true, qty: true, unit: true } },
    },
  })
  if (!tile) return null

  const fetcher = PRICE_FETCHERS[tile.store]
  if (!fetcher) return null

  const priceRows = await prisma.storePrice.findMany({
    where: { store: tile.store },
    select: { itemKey: true },
  })
  const pricedKeys = new Set(priceRows.map((row) => row.itemKey))
  const missing = tile.items
    .filter((item) => !pricedKeys.has(itemKeyFor(item.title, item.brand)))
    .slice(0, 20)

  // Bounded parallel pool (4 at a time) instead of one item at a time.
  // A 250 ms gap is kept only after a chunk that actually booked a price;
  // chunks where every lookup returned null/failed instantly don't wait.
  // One revalidation at the end, as before.
  const POOL_SIZE = 4
  let failed = 0
  for (let i = 0; i < missing.length; i += POOL_SIZE) {
    const chunk = missing.slice(i, i + POOL_SIZE)
    let anySuccess = false
    await Promise.allSettled(
      chunk.map(async (item) => {
        try {
          const result = await fetcher(item.title, item.brand, item.qty, item.unit)
          if (result) {
            anySuccess = true
            const itemKey = itemKeyFor(item.title, item.brand)
            await prisma.storePrice.upsert({
              where: { store_itemKey: { store: tile.store, itemKey } },
              create: { store: tile.store, itemKey, price: result.price, unit: result.unit ?? item.unit },
              update: { price: result.price, unit: result.unit ?? item.unit },
            })
          }
          // A null return means the store simply doesn't carry the item:
          // attempted, not failed — only a thrown fetcher counts.
        } catch {
          // A failed lookup leaves the item unpriced; never break the list.
          failed += 1
        }
      })
    )
    if (anySuccess) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  revalidatePath(`/list-item/${listTileID}`)
  return { attempted: missing.length, failed }
}

export async function getPriceSearchInfo(listTileID: number | string) {
  const id = Number(listTileID)
  if (!id) return { supported: false, store: null as string | null }
  const tile = await prisma.listTile.findUnique({
    where: { id },
    select: { store: true },
  })
  if (!tile) return { supported: false, store: null as string | null }
  const supported = SUPPORTED_SEARCH_STORES.includes(tile.store)
  return { supported, store: supported ? tile.store : null }
}

export async function searchStoreProductsAction(
  listTileID: number | string,
  query: string
) {
  const id = Number(listTileID)
  const q = query.trim()
  if (!id || q.length < 2) return []
  const info = await getPriceSearchInfo(id)
  if (!info.supported || !info.store) return []
  const results = await searchStoreProducts(info.store, q)
  return results.slice(0, 15)
}
