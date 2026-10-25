import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Header } from "@/components/ui/Header"
import Footer from "@/components/ui/Footer"
import ItemRow from "@/components/Client/ItemRow"
import { DeleteModeProvider } from "@/components/Client/DeleteModeProvider"
import PendingDeleteProvider from "@/components/Client/PendingDeleteProvider"
import ClearCompletedButton from "@/components/Client/ClearCompletedButton"
import ResetCompletedButton from "@/components/Client/ResetCompletedButton"
import LookupPricesButton from "@/components/Client/LookupPricesButton"
import { itemKeyFor } from "@/lib/prices"
import { SUPPORTED_PRICE_STORES } from "@/lib/price-fetch"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const tile = await prisma.listTile.findUnique({
    where: { id: Number(id) },
    select: { store: true },
  })
  return { title: tile ? `${tile.store} · Shared Pantry` : "Shared Pantry" }
}

export default async function ListItem({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bIsListPage = true

  const tile = await prisma.listTile.findUnique({
    where: { id: Number(id) },
    include: {
      items: {
        orderBy: [{ completed: "asc" }, { createdAt: "asc" }],
        include: {
          requestedBy: { select: { name: true, color: true } },
          checkedOffBy: { select: { name: true, color: true } },
        },
      },
    },
  })

  if (!tile) redirect("/")

  const lists = await prisma.listTile.findMany({
    select: { id: true, store: true },
    orderBy: { createdAt: "asc" },
  })

  const priceRows = await prisma.storePrice.findMany({
    where: { store: tile.store },
  })
  const priceByKey = new Map(priceRows.map((row) => [row.itemKey, row.price]))
  const priceFor = (item: { title: string; brand: string | null }) =>
    priceByKey.get(itemKeyFor(item.title, item.brand)) ?? null

  const activeItems = tile.items.filter((item) => !item.completed)
  const completedItems = tile.items.filter((item) => item.completed)

  let estimatedTotal = 0
  let pricedCount = 0
  for (const item of tile.items) {
    const price = priceFor(item)
    if (price !== null) {
      estimatedTotal += price * item.qty
      pricedCount += 1
    }
  }
  const missingCount = tile.items.length - pricedCount

  return (
    <div className="min-h-screen bg-rose-50 font-sans">
      <Header
        bis_list_page={bIsListPage}
        listTileID={tile.id}
        listStore={tile.store}
        lists={lists}
        estimatedTotal={estimatedTotal}
        pricedCount={pricedCount}
        itemCount={tile.items.length}
      />
      <DeleteModeProvider listTileID={tile.id}>
        <PendingDeleteProvider>
          <main className="mx-auto max-w-3xl px-4 pb-32 pt-24 portrait:pt-36 sm:pt-28 sm:portrait:pt-44">
            {SUPPORTED_PRICE_STORES.includes(tile.store) && missingCount > 0 && (
              <LookupPricesButton
                listTileID={tile.id}
                store={tile.store}
                missingCount={missingCount}
              />
            )}

            <div className="flex flex-col">
              {activeItems.map((item) => (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  brand={item.brand}
                  qty={item.qty}
                  unit={item.unit}
                  completed={item.completed}
                  listTileID={tile.id}
                  price={priceFor(item)}
                  requestedBy={item.requestedBy}
                  checkedOffBy={item.checkedOffBy}
                />
              ))}
            </div>

            {completedItems.length > 0 && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <ResetCompletedButton listTileID={tile.id} />
                  <span className="text-sm font-semibold text-neutral-500">Completed</span>
                  <div className="h-px flex-1 bg-rose-200" />
                  <ClearCompletedButton
                    listTileID={tile.id}
                    completedIds={completedItems.map((item) => item.id)}
                  />
                </div>
                <div className="flex flex-col">
                  {completedItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      brand={item.brand}
                      qty={item.qty}
                      unit={item.unit}
                      completed={item.completed}
                      listTileID={tile.id}
                      price={priceFor(item)}
                      requestedBy={item.requestedBy}
                      checkedOffBy={item.checkedOffBy}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
          <Footer bis_list_page={bIsListPage} />
        </PendingDeleteProvider>
      </DeleteModeProvider>
    </div>
  )
}
