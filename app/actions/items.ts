"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { itemKeyFor } from "@/lib/price-book"
import { getCurrentProfile } from "@/lib/profiles"
import {
  clearStorePrice,
  formId,
  formString,
  revalidateList,
  saveStorePrice,
  tileStore,
} from "@/app/actions/helpers"

export async function createListItem(formData: FormData) {
  const title = formString(formData, "title")
  const listTileID = formId(formData, "listTileID")
  if (!title || !listTileID) return

  const qtyRaw = formString(formData, "qty")
  const unitRaw = formString(formData, "unit")
  const brandRaw = formString(formData, "brand")
  const priceRaw = formString(formData, "price")

  // Non-finite qty is rejected outright; qty is clamped at 0. A non-finite
  // price is ignored (the item is created unpriced) instead of throwing
  // after the row was created.
  const qty = qtyRaw ? Number(qtyRaw) : 1
  if (!Number.isFinite(qty)) return
  const clampedQty = Math.max(0, qty)
  const price = priceRaw ? Number(priceRaw) : null
  const validPrice = price !== null && Number.isFinite(price) ? price : null

  const profile = await getCurrentProfile()
  const store = validPrice !== null ? await tileStore(listTileID) : null

  await prisma.$transaction(async (tx) => {
    await tx.listItem.create({
      data: {
        title,
        brand: brandRaw || null,
        qty: clampedQty,
        unit: unitRaw || null,
        listTile: { connect: { id: listTileID } },
        requestedBy: profile ? { connect: { id: profile.id } } : undefined,
      },
    })

    if (validPrice !== null && store) {
      await saveStorePrice(store, title, brandRaw || null, validPrice, unitRaw || null, tx)
    }
  })

  revalidatePath(`/list-item/${listTileID}`)
}

export async function updateListItem(formData: FormData) {
  const id = formId(formData, "id")
  const listTileID = formId(formData, "listTileID")
  if (!id) return

  const existing = await prisma.listItem.findUnique({ where: { id } })
  if (!existing) return

  const titleRaw = formString(formData, "title")
  const qtyRaw = formString(formData, "qty")
  const unitRaw = formString(formData, "unit")
  const brandRaw = formString(formData, "brand")

  const effectiveTitle = titleRaw || existing.title
  const effectiveBrand = brandRaw || null
  const effectiveUnit = unitRaw || null

  const data: { title?: string; qty?: number; unit: string | null; brand: string | null } = {
    unit: effectiveUnit,
    brand: effectiveBrand,
  }
  if (titleRaw) data.title = titleRaw
  // A non-finite qty is ignored; qty is clamped at 0.
  if (qtyRaw) {
    const qty = Number(qtyRaw)
    if (Number.isFinite(qty)) data.qty = Math.max(0, qty)
  }

  const store = listTileID && formData.has("price") ? await tileStore(listTileID) : null
  const priceRaw = formData.has("price") ? formString(formData, "price") : null
  const price =
    priceRaw && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null
  const priceIsValid = priceRaw === null || priceRaw === "" || price !== null

  await prisma.$transaction(async (tx) => {
    await tx.listItem.update({ where: { id }, data })

    if (store && formData.has("price") && priceIsValid) {
      const oldKey = itemKeyFor(existing.title, existing.brand)
      const newKey = itemKeyFor(effectiveTitle, effectiveBrand)
      if (!priceRaw) {
        await clearStorePrice(store, existing.title, existing.brand, tx)
        await clearStorePrice(store, effectiveTitle, effectiveBrand, tx)
      } else if (price !== null) {
        await saveStorePrice(store, effectiveTitle, effectiveBrand, price, effectiveUnit, tx)
        // A rename orphans the row under the old key — remove it so the
        // old title/brand doesn't keep a stale price.
        if (oldKey !== newKey) {
          await clearStorePrice(store, existing.title, existing.brand, tx)
        }
      }
    }
  })

  if (listTileID) revalidateList(listTileID)
  else revalidatePath("/full-list")
}

export async function toggleListItem(formData: FormData) {
  const id = formId(formData, "id")
  const listTileID = formId(formData, "listTileID")
  if (!id) return

  const expectedRaw = formData.get("completed")
  const expected = expectedRaw === null ? null : expectedRaw === "true"

  // The atomic path requires the acted-on state in FormData; without it
  // there is nothing safe to toggle against, so bail out instead of
  // falling back to a read-then-write.
  if (expected === null) return

  // Atomic toggle: the update only lands when the row still holds the
  // state the client acted on, so a double-tap (or two devices) can't
  // both read the same value and swallow the second tap.
  const nowCompleted = !expected
  const profile = nowCompleted ? await getCurrentProfile() : null
  const result = await prisma.listItem.updateMany({
    where: { id, completed: expected },
    data: {
      completed: nowCompleted,
      checkedOffByID: nowCompleted ? (profile?.id ?? null) : null,
    },
  })
  if (result.count === 0) {
    // Someone else toggled first — re-read and flip the current state.
    const current = await prisma.listItem.findUnique({
      where: { id },
      select: { completed: true },
    })
    if (!current) return
    const nowCompleted2 = !current.completed
    const profile2 = nowCompleted2 ? await getCurrentProfile() : null
    await prisma.listItem.update({
      where: { id },
      data: {
        completed: nowCompleted2,
        checkedOffBy: nowCompleted2
          ? profile2
            ? { connect: { id: profile2.id } }
            : undefined
          : { disconnect: true },
      },
    })
  }
  if (listTileID) revalidateList(listTileID)
  else revalidatePath("/full-list")
}

export async function deleteListItem(formData: FormData) {
  const id = formId(formData, "id")
  const listTileID = formId(formData, "listTileID")
  if (!id) return

  await prisma.listItem.deleteMany({
    where: { id, ...(listTileID ? { listTileID } : {}) },
  })
  if (listTileID) revalidateList(listTileID)
  else revalidatePath("/full-list")
}

export async function deleteListItems(formData: FormData) {
  const listTileID = formId(formData, "listTileID")
  const ids = formString(formData, "ids")
    .split(",")
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  if (ids.length === 0) return

  await prisma.listItem.deleteMany({
    where: { id: { in: ids }, ...(listTileID ? { listTileID } : {}) },
  })
  if (listTileID) revalidatePath(`/list-item/${listTileID}`)
}

export async function deleteCompletedItems(formData: FormData) {
  const listTileID = formId(formData, "listTileID")
  if (!listTileID) return

  await prisma.listItem.deleteMany({ where: { listTileID, completed: true } })
  revalidatePath(`/list-item/${listTileID}`)
}

export async function resetCompletedItems(formData: FormData) {
  const listTileID = formId(formData, "listTileID")
  if (!listTileID) return

  await prisma.listItem.updateMany({
    where: { listTileID, completed: true },
    data: { completed: false, checkedOffByID: null },
  })
  revalidatePath(`/list-item/${listTileID}`)
}
