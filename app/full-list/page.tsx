import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Header } from "@/components/ui/Header"
import Footer from "@/components/ui/Footer"
import ItemRow from "@/components/Client/ItemRow"
import { DeleteModeProvider } from "@/components/Client/DeleteModeProvider"
import PendingDeleteProvider from "@/components/Client/PendingDeleteProvider"
import FullListToggle from "@/components/Client/FullListToggle"
import { itemKeyFor } from "@/lib/prices"

export const metadata: Metadata = { title: "Full List · Shared Pantry" }

export default async function FullList() {
  const tiles = await prisma.listTile.findMany({
    orderBy: { createdAt: "asc" },
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

  // The price book is keyed by store name, so one map covers every list.
  const priceRows = await prisma.storePrice.findMany()
  const priceByKey = new Map(
    priceRows.map((row) => [`${row.store}|${row.itemKey}`, row.price])
  )
  const priceFor = (store: string, item: { title: string; brand: string | null }) =>
    priceByKey.get(`${store}|${itemKeyFor(item.title, item.brand)}`) ?? null

  const includedTiles = tiles.filter((tile) => tile.includeInFullList)

  // The Header total covers the included lists only — what you still need.
  let estimatedTotal = 0
  let pricedCount = 0
  let itemCount = 0
  for (const tile of includedTiles) {
    for (const item of tile.items) {
      itemCount += 1
      const price = priceFor(tile.store, item)
      if (price !== null) {
        estimatedTotal += price * item.qty
        pricedCount += 1
      }
    }
  }

  // Completed items from every included list, combined into one section at
  // the bottom. Each store keeps a small label so you can see where an item
  // came from (and which list it returns to if you un-check it).
  const completedByTile = includedTiles
    .map((tile) => ({
      listTileID: tile.id,
      store: tile.store,
      items: tile.items.filter((item) => item.completed),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="min-h-screen bg-rose-50 font-sans">
      <Header
        bis_full_list_page
        lists={tiles}
        estimatedTotal={estimatedTotal}
        pricedCount={pricedCount}
        itemCount={itemCount}
      />
      {/* DeleteModeProvider only exists because ItemRow requires it. The
          Full List has no bulk-delete UI, so its listTileID is unused. */}
      <DeleteModeProvider listTileID={0}>
        <PendingDeleteProvider>
          <main className="mx-auto max-w-5xl px-4 pb-32 pt-24 portrait:pt-36 sm:pt-28 sm:portrait:pt-44">
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Toggles live in the left margin on wide screens, stuck under
                  the header so they're always reachable. On narrow screens
                  there's no margin, so they stack above the list as before. */}
              <aside className="shrink-0 lg:sticky lg:top-28 lg:w-60 lg:self-start">
                <p className="mb-2 text-sm font-semibold text-neutral-500">
                  Lists in this view
                </p>
                <div className="flex flex-col divide-y divide-rose-100 rounded-lg bg-white ring-1 ring-rose-200">
                  {tiles.map((tile) => (
                    <FullListToggle
                      key={tile.id}
                      listTileID={tile.id}
                      store={tile.store}
                      included={tile.includeInFullList}
                    />
                  ))}
                </div>
              </aside>

              <div className="min-w-0 flex-1">
                {includedTiles.length === 0 && (
                  <p className="text-center text-neutral-500">
                    No lists included — turn one on to see what you need.
                  </p>
                )}

                {includedTiles.map((tile) => {
                  const activeItems = tile.items.filter((item) => !item.completed)
                  if (activeItems.length === 0) return null
                  return (
                    <section key={tile.id} className="mb-8">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="text-sm font-semibold text-neutral-500">
                          {tile.store}
                        </span>
                        <div className="h-px flex-1 bg-rose-200" />
                      </div>
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
                            price={priceFor(tile.store, item)}
                            requestedBy={item.requestedBy}
                            checkedOffBy={item.checkedOffBy}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}

                {completedByTile.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-sm font-semibold text-neutral-500">
                        Completed
                      </span>
                      <div className="h-px flex-1 bg-rose-200" />
                    </div>
                    {completedByTile.map((group) => (
                      <div key={group.listTileID} className="mb-4">
                        <p className="mb-1 text-xs font-medium text-neutral-400">
                          {group.store}
                        </p>
                        <div className="flex flex-col">
                          {group.items.map((item) => (
                            <ItemRow
                              key={item.id}
                              id={item.id}
                              title={item.title}
                              brand={item.brand}
                              qty={item.qty}
                              unit={item.unit}
                              completed={item.completed}
                              listTileID={group.listTileID}
                              price={priceFor(group.store, item)}
                              requestedBy={item.requestedBy}
                              checkedOffBy={item.checkedOffBy}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            </div>
          </main>
          <Footer />
        </PendingDeleteProvider>
      </DeleteModeProvider>
    </div>
  )
}
