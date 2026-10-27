import type { Metadata } from "next"
import { cache } from "react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Header from "@/components/Server/Header"
import Footer from "@/components/Server/Footer"
import ItemRows from "@/components/Server/ItemRows"
import { DeleteModeProvider } from "@/components/Client/DeleteModeProvider"
import { PendingDeleteProvider } from "@/components/Client/PendingDeleteProvider"
import ClearCompletedButton from "@/components/Client/ClearCompletedButton"
import ResetCompletedButton from "@/components/Client/ResetCompletedButton"
import LookupPricesButton from "@/components/Client/LookupPricesButton"
import { buildPriceLookup, summarizePrices } from "@/lib/price-book"
import { SUPPORTED_PRICE_STORES } from "@/lib/price-fetch"

// One cached tile fetch shared by generateMetadata and the page, so the
// list page doesn't read the same tile twice.
const getTile = cache(async (id: number) =>
  prisma.listTile.findUnique({
    where: { id },
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
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const tile = await getTile(Number(id))
  return { title: tile ? `${tile.store} · Shared Pantry` : "Shared Pantry" }
}

export default async function ListItem({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const isListPage = true

  const tile = await getTile(Number(id))

  if (!tile) redirect("/")

  const [lists, priceRows] = await Promise.all([
    prisma.listTile.findMany({
      select: { id: true, store: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.storePrice.findMany({
      where: { store: tile.store },
      select: { store: true, itemKey: true, price: true },
    }),
  ])
  const priceLookup = buildPriceLookup(priceRows)
  const priceFor = (item: { title: string; brand: string | null }) =>
    priceLookup(tile.store, item.title, item.brand)

  const activeItems = tile.items.filter((item) => !item.completed)
  const completedItems = tile.items.filter((item) => item.completed)

  const { estimatedTotal, pricedCount } = summarizePrices(tile.items, priceFor)
  const missingCount = tile.items.length - pricedCount

  return (
    <div className="min-h-screen bg-ck-bg font-sans lg:pl-56">
      <Header
        isListPage={isListPage}
        listTileID={tile.id}
        listStore={tile.store}
        lists={lists}
        estimatedTotal={estimatedTotal}
        pricedCount={pricedCount}
        itemCount={tile.items.length}
      />
      <DeleteModeProvider>
        <PendingDeleteProvider>
          <main className="mx-auto max-w-3xl px-4 pb-32 pt-24 portrait:pt-36 sm:pt-28 sm:portrait:pt-44">
            {SUPPORTED_PRICE_STORES.includes(tile.store) && missingCount > 0 && (
              <LookupPricesButton
                listTileID={tile.id}
                store={tile.store}
                missingCount={missingCount}
              />
            )}

            <ItemRows
              items={activeItems.map((item) => ({
                ...item,
                listTileID: tile.id,
                price: priceFor(item),
              }))}
            />

            {completedItems.length > 0 && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <ResetCompletedButton listTileID={tile.id} />
                  <span className="text-sm font-semibold text-ck-muted">Completed</span>
                  <div className="h-px flex-1 bg-ck-border" />
                  <ClearCompletedButton
                    listTileID={tile.id}
                    completedIds={completedItems.map((item) => item.id)}
                  />
                </div>
                <ItemRows
                  items={completedItems.map((item) => ({
                    ...item,
                    listTileID: tile.id,
                    price: priceFor(item),
                  }))}
                />
              </>
            )}
          </main>
          <Footer bis_list_page={isListPage} listTileID={tile.id} />
        </PendingDeleteProvider>
      </DeleteModeProvider>
    </div>
  )
}
