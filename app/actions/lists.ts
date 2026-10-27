"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { itemKeyFor } from "@/lib/price-book"
import { formBool, formId, formString } from "@/app/actions/helpers"

export async function createListTile(formData: FormData) {
  const store = formString(formData, "store")
  if (!store) return null
  const tile = await prisma.listTile.create({ data: { store } })
  revalidatePath("/")
  return tile.id
}

export async function updateListTile(formData: FormData) {
  const id = formId(formData, "id")
  const store = formString(formData, "store")
  if (!id || !store) return
  const existing = await prisma.listTile.findUnique({
    where: { id },
    select: { store: true },
  })
  if (!existing) return
  // Renaming a list migrates this tile's price rows to the new store
  // name, in the same transaction as the rename. The price book is
  // keyed by store name and shared across lists, so migrating every row
  // under the old name would move other lists' prices too — and rows
  // another list at the old store still uses are copied, not moved.
  await prisma.$transaction(async (tx) => {
    await tx.listTile.update({ where: { id }, data: { store } })
    if (existing.store !== store) {
      const items = await tx.listItem.findMany({
        where: { listTileID: id },
        select: { title: true, brand: true },
      })
      const itemKeys = [
        ...new Set(items.map((item) => itemKeyFor(item.title, item.brand))),
      ]
      if (itemKeys.length > 0) {
        // Shared-key rule: the price book is keyed by (store, itemKey)
        // and shared across lists, so a row at the old store may still
        // be another list's only price for that item. Find the keys
        // another tile at the old store still uses; those rows are
        // COPIED to the new store (source row kept) instead of moved,
        // and on a destination collision the source row is kept too —
        // never deleted, never overwriting the destination row. Only
        // keys used solely by this tile are moved (or dropped on
        // collision), so a same-store sibling list keeps its price.
        const otherItems = await tx.listItem.findMany({
          where: { listTileID: { not: id }, listTile: { store: existing.store } },
          select: { title: true, brand: true },
        })
        const sharedKeys = new Set(
          otherItems.map((item) => itemKeyFor(item.title, item.brand))
        )
        // Collision handling: if the destination store already prices
        // one of this tile's items, keep the destination row instead
        // of overwriting it. The renamed list's item then resolves to
        // the destination price (the price book is keyed by store
        // name), so it stays priced, lists sharing the destination
        // row are untouched, and the @@unique([store, itemKey])
        // constraint can never roll back the rename.
        const colliding = await tx.storePrice.findMany({
          where: { store, itemKey: { in: itemKeys } },
          select: { itemKey: true },
        })
        const collidingKeys = new Set(colliding.map((row) => row.itemKey))
        const exclusiveKeys = itemKeys.filter((key) => !sharedKeys.has(key))
        const migratingKeys = exclusiveKeys.filter(
          (key) => !collidingKeys.has(key)
        )
        if (migratingKeys.length > 0) {
          await tx.storePrice.updateMany({
            where: { store: existing.store, itemKey: { in: migratingKeys } },
            data: { store },
          })
        }
        const collidingExclusiveKeys = exclusiveKeys.filter((key) =>
          collidingKeys.has(key)
        )
        if (collidingExclusiveKeys.length > 0) {
          await tx.storePrice.deleteMany({
            where: {
              store: existing.store,
              itemKey: { in: collidingExclusiveKeys },
            },
          })
        }
        const sharedToCopy = itemKeys.filter(
          (key) => sharedKeys.has(key) && !collidingKeys.has(key)
        )
        if (sharedToCopy.length > 0) {
          const sourceRows = await tx.storePrice.findMany({
            where: { store: existing.store, itemKey: { in: sharedToCopy } },
            select: { itemKey: true, price: true, unit: true },
          })
          if (sourceRows.length > 0) {
            await tx.storePrice.createMany({
              data: sourceRows.map((row) => ({
                store,
                itemKey: row.itemKey,
                price: row.price,
                unit: row.unit,
              })),
              skipDuplicates: true,
            })
          }
        }
      }
    }
  })
  revalidatePath(`/list-item/${id}`)
  revalidatePath("/")
}

export async function deleteListTile(formData: FormData) {
  const id = formId(formData, "id")
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
  const id = formId(formData, "id")
  const include = formBool(formData, "include")
  if (!id) return
  await prisma.listTile.update({
    where: { id },
    data: { includeInFullList: include },
  })
  revalidatePath("/full-list")
}
