import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import Header from "@/components/Server/Header"
import Footer from "@/components/Server/Footer"
import ItemRows from "@/components/Server/ItemRows"
import { DeleteModeProvider } from "@/components/Client/DeleteModeProvider"
import { PendingDeleteProvider } from "@/components/Client/PendingDeleteProvider"
import FullListToggle from "@/components/Client/FullListToggle"
import { buildPriceLookup, summarizePrices } from "@/lib/price-book"

export const metadata: Metadata = { title: "Full List · Shared Pantry" }

export default async function FullList() {
  const [tiles, priceRows] = await Promise.all([
    prisma.listTile.findMany({
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
    }),
    prisma.storePrice.findMany({
      select: { store: true, itemKey: true, price: true },
    }),
  ])

  // The price book is keyed by store name, so one map covers every list.
  const priceLookup = buildPriceLookup(priceRows)
  const priceFor = (store: string, item: { title: string; brand: string | null }) =>
    priceLookup(store, item.title, item.brand)

  const includedTiles = tiles.filter((tile) => tile.includeInFullList)

  // The Header total covers the included lists only — what you still need.
  const { estimatedTotal, pricedCount, itemCount } = summarizePrices(
    includedTiles.flatMap((tile) =>
      tile.items.map((item) => ({ ...item, store: tile.store }))
    ),
    (entry) => priceFor(entry.store, entry)
  )

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
    <div className="min-h-screen bg-ck-bg font-sans lg:pl-56">
      <Header
        isFullListPage
        lists={tiles}
        estimatedTotal={estimatedTotal}
        pricedCount={pricedCount}
        itemCount={itemCount}
      />
      <DeleteModeProvider>
        <PendingDeleteProvider>
          <main className="mx-auto max-w-5xl px-4 pb-32 pt-24 portrait:pt-36 sm:pt-28 sm:portrait:pt-44">
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Toggles live in the left margin on wide screens, stuck under
                  the header so they're always reachable. On narrow screens
                  there's no margin, so they stack above the list as before. */}
              <aside className="shrink-0 lg:sticky lg:top-28 lg:w-60 lg:self-start">
                <p className="mb-2 text-sm font-semibold text-ck-muted">
                  Lists in this view
                </p>
                <div className="flex flex-col divide-y divide-ck-border rounded-lg bg-ck-surface ring-1 ring-ck-border">
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
                  <p className="text-center text-ck-muted">
                    No lists included — turn one on to see what you need.
                  </p>
                )}

                {includedTiles.map((tile) => {
                  const activeItems = tile.items.filter((item) => !item.completed)
                  if (activeItems.length === 0) return null
                  return (
                    <section key={tile.id} className="mb-8">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="font-serif text-sm font-semibold text-ck-muted">
                          {tile.store}
                        </span>
                        <div className="h-px flex-1 bg-ck-border" />
                      </div>
                      <ItemRows
                        items={activeItems.map((item) => ({
                          ...item,
                          listTileID: tile.id,
                          price: priceFor(tile.store, item),
                        }))}
                      />
                    </section>
                  )
                })}

                {completedByTile.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-sm font-semibold text-ck-muted">
                        Completed
                      </span>
                      <div className="h-px flex-1 bg-ck-border" />
                    </div>
                    {completedByTile.map((group) => (
                      <div key={group.listTileID} className="mb-4">
                        <p className="mb-1 text-xs font-medium text-ck-muted">
                          {group.store}
                        </p>
                        <ItemRows
                          items={group.items.map((item) => ({
                            ...item,
                            listTileID: group.listTileID,
                            price: priceFor(group.store, item),
                          }))}
                        />
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
