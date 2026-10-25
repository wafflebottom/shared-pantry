"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { itemKeyFor } from "@/lib/prices"
import { PROFILE_COOKIE, getCurrentProfile } from "@/lib/profiles"
import { DEFAULT_PROFILE_COLOR, PROFILE_COLORS } from "@/lib/profile-colors"
import {
  PRICE_FETCHERS,
  SUPPORTED_SEARCH_STORES,
  searchStoreProducts,
} from "@/lib/price-fetch"


export async function createListTile(formData: FormData) {
  const store = String(formData.get("store") ?? "").trim()
  if (!store) return null
  const tile = await prisma.listTile.create({ data: { store } })
  revalidatePath("/")
  return tile.id
}

export async function updateListTile(formData: FormData) {
  const id = Number(formData.get("id"))
  const store = String(formData.get("store") ?? "").trim()
  if (!id || !store) return
  await prisma.listTile.update({ where: { id }, data: { store } })
  revalidatePath(`/list-item/${id}`)
  revalidatePath("/")
}

export async function deleteListTile(formData: FormData) {
  const id = Number(formData.get("id"))
  if (!id) return

  // Items cascade via the foreign key; the store's price book is keyed by
  // store name, not by tile, so it survives for the next list at this store.
  await prisma.listTile.deleteMany({ where: { id } })
  revalidatePath("/")
  revalidatePath(`/list-item/${id}`)
}

// Toggles whether a list's items appear in the Full List. The choice is
// stored on the tile so it follows the user across devices.
export async function setFullListInclude(formData: FormData) {
  const id = Number(formData.get("id"))
  const include = String(formData.get("include") ?? "") === "true"
  if (!id) return
  await prisma.listTile.update({
    where: { id },
    data: { includeInFullList: include },
  })
  revalidatePath("/full-list")
}

// Claims this device for a profile: the cookie is how the server knows
// who is acting from then on.
export async function setCurrentProfile(formData: FormData) {
  const id = Number(formData.get("profileId"))
  if (!id) return
  const profile = await prisma.profile.findUnique({ where: { id } })
  if (!profile) return
  const jar = await cookies()
  jar.set(PROFILE_COOKIE, String(id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath("/", "layout")
}

// Adds a profile and claims this device for it. Adding a name that
// already exists just claims that profile instead of erroring on the
// unique constraint.
export async function createProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const color = String(formData.get("color") ?? "")
  if (!name) return
  const validColor = (Object.values(PROFILE_COLORS) as string[]).includes(color)
    ? color
    : DEFAULT_PROFILE_COLOR

  const existing = await prisma.profile.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  const profile =
    existing ?? (await prisma.profile.create({ data: { name, color: validColor } }))

  const jar = await cookies()
  jar.set(PROFILE_COOKIE, String(profile.id), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath("/", "layout")
}

export async function createListItem(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  const listTileID = Number(formData.get("listTileID"))
  if (!title || !listTileID) return

  const qtyRaw = String(formData.get("qty") ?? "").trim()
  const unitRaw = String(formData.get("unit") ?? "").trim()
  const brandRaw = String(formData.get("brand") ?? "").trim()
  const priceRaw = String(formData.get("price") ?? "").trim()

  const profile = await getCurrentProfile()

  await prisma.listItem.create({
    data: {
      title,
      brand: brandRaw || null,
      qty: qtyRaw ? Number(qtyRaw) : 1,
      unit: unitRaw || null,
      listTile: { connect: { id: listTileID } },
      requestedBy: profile ? { connect: { id: profile.id } } : undefined,
    },
  })

  if (priceRaw) {
    const tile = await prisma.listTile.findUnique({
      where: { id: listTileID },
      select: { store: true },
    })
    if (tile) {
      const itemKey = itemKeyFor(title, brandRaw || null)
      await prisma.storePrice.upsert({
        where: { store_itemKey: { store: tile.store, itemKey } },
        create: { store: tile.store, itemKey, price: Number(priceRaw), unit: unitRaw || null },
        update: { price: Number(priceRaw), unit: unitRaw || null },
      })
    }
  }

  revalidatePath(`/list-item/${listTileID}`)
}

export async function updateListItem(formData: FormData) {
  const id = Number(formData.get("id"))
  const listTileID = Number(formData.get("listTileID"))
  if (!id) return

  const existing = await prisma.listItem.findUnique({ where: { id } })
  if (!existing) return

  const titleRaw = String(formData.get("title") ?? "").trim()
  const qtyRaw = String(formData.get("qty") ?? "").trim()
  const unitRaw = String(formData.get("unit") ?? "").trim()
  const brandRaw = String(formData.get("brand") ?? "").trim()

  const effectiveTitle = titleRaw || existing.title
  const effectiveBrand = brandRaw || null
  const effectiveUnit = unitRaw || null

  const data: { title?: string; qty?: number; unit: string | null; brand: string | null } = {
    unit: effectiveUnit,
    brand: effectiveBrand,
  }
  if (titleRaw) data.title = titleRaw
  if (qtyRaw) data.qty = Number(qtyRaw)

  await prisma.listItem.update({ where: { id }, data })

  if (listTileID && formData.has("price")) {
    const priceRaw = String(formData.get("price") ?? "").trim()
    const tile = await prisma.listTile.findUnique({
      where: { id: listTileID },
      select: { store: true },
    })
    if (tile) {
      const itemKey = itemKeyFor(effectiveTitle, effectiveBrand)
      if (!priceRaw) {
        await prisma.storePrice.deleteMany({
          where: { store: tile.store, itemKey },
        })
      } else {
        await prisma.storePrice.upsert({
          where: { store_itemKey: { store: tile.store, itemKey } },
          create: { store: tile.store, itemKey, price: Number(priceRaw), unit: effectiveUnit },
          update: { price: Number(priceRaw), unit: effectiveUnit },
        })
      }
    }
  }

  if (listTileID) revalidatePath(`/list-item/${listTileID}`)
  revalidatePath("/full-list")
}

export async function toggleListItem(formData: FormData) {
  const id = Number(formData.get("id"))
  const listTileID = Number(formData.get("listTileID"))
  if (!id) return

  const item = await prisma.listItem.findUnique({ where: { id }, select: { completed: true } })
  if (!item) return

  // Checking an item off stamps who did it; un-checking clears the stamp.
  const nowCompleted = !item.completed
  const profile = nowCompleted ? await getCurrentProfile() : null

  await prisma.listItem.update({
    where: { id },
    data: {
      completed: nowCompleted,
      checkedOffBy: nowCompleted
        ? profile
          ? { connect: { id: profile.id } }
          : undefined
        : { disconnect: true },
    },
  })
  if (listTileID) revalidatePath(`/list-item/${listTileID}`)
  revalidatePath("/full-list")
}

export async function deleteListItem(formData: FormData) {
  const id = Number(formData.get("id"))
  const listTileID = Number(formData.get("listTileID"))
  if (!id) return

  await prisma.listItem.deleteMany({ where: { id } })
  if (listTileID) revalidatePath(`/list-item/${listTileID}`)
  revalidatePath("/full-list")
}

export async function deleteListItems(formData: FormData) {
  const listTileID = Number(formData.get("listTileID"))
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  if (ids.length === 0) return

  await prisma.listItem.deleteMany({ where: { id: { in: ids } } })
  if (listTileID) revalidatePath(`/list-item/${listTileID}`)
}

export async function deleteCompletedItems(formData: FormData) {
  const listTileID = Number(formData.get("listTileID"))
  if (!listTileID) return

  await prisma.listItem.deleteMany({ where: { listTileID, completed: true } })
  revalidatePath(`/list-item/${listTileID}`)
}

export async function resetCompletedItems(formData: FormData) {
  const listTileID = Number(formData.get("listTileID"))
  if (!listTileID) return

  await prisma.listItem.updateMany({
    where: { listTileID, completed: true },
    data: { completed: false, checkedOffByID: null },
  })
  revalidatePath(`/list-item/${listTileID}`)
}

export async function lookupMissingPrices(formData: FormData) {
  const listTileID = Number(formData.get("listTileID"))
  if (!listTileID) return

  const tile = await prisma.listTile.findUnique({
    where: { id: listTileID },
    include: { items: true },
  })
  if (!tile) return

  const fetcher = PRICE_FETCHERS[tile.store]
  if (!fetcher) return

  const priceRows = await prisma.storePrice.findMany({ where: { store: tile.store } })
  const pricedKeys = new Set(priceRows.map((row) => row.itemKey))
  const missing = tile.items
    .filter((item) => !pricedKeys.has(itemKeyFor(item.title, item.brand)))
    .slice(0, 20)

  for (const item of missing) {
    try {
      const result = await fetcher(item.title, item.brand, item.qty, item.unit)
      if (result) {
        const itemKey = itemKeyFor(item.title, item.brand)
        await prisma.storePrice.upsert({
          where: { store_itemKey: { store: tile.store, itemKey } },
          create: { store: tile.store, itemKey, price: result.price, unit: result.unit ?? item.unit },
          update: { price: result.price },
        })
      }
    } catch {
      // a failed lookup leaves the item unpriced; never break the list
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  revalidatePath(`/list-item/${listTileID}`)
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
  const tile = await prisma.listTile.findUnique({
    where: { id },
    select: { store: true },
  })
  if (!tile || !SUPPORTED_SEARCH_STORES.includes(tile.store)) return []
  const results = await searchStoreProducts(tile.store, q)
  return results.slice(0, 15)
}
