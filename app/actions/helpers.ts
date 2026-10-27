import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { itemKeyFor } from "@/lib/price-book"

// Shared helpers for the server-action modules in this directory. This
// file has no "use server" directive — it is imported by the action
// modules, never called from the client.

export function formId(formData: FormData, key: string): number {
  return Number(formData.get(key))
}

export function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim()
}

export function formBool(formData: FormData, key: string): boolean {
  return String(formData.get(key) ?? "") === "true"
}

export function revalidateList(id: number) {
  revalidatePath(`/list-item/${id}`)
  revalidatePath("/full-list")
}

export async function tileStore(listTileID: number): Promise<string | null> {
  const tile = await prisma.listTile.findUnique({
    where: { id: listTileID },
    select: { store: true },
  })
  return tile?.store ?? null
}

export async function saveStorePrice(
  store: string,
  title: string,
  brand: string | null,
  price: number,
  unit: string | null,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma
  const itemKey = itemKeyFor(title, brand)
  await db.storePrice.upsert({
    where: { store_itemKey: { store, itemKey } },
    create: { store, itemKey, price, unit },
    update: { price, unit },
  })
}

export async function clearStorePrice(
  store: string,
  title: string,
  brand: string | null,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma
  await db.storePrice.deleteMany({
    where: { store, itemKey: itemKeyFor(title, brand) },
  })
}
