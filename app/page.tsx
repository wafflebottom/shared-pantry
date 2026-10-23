import { prisma } from "@/lib/prisma"
import { Header } from "@/components/ui/Header"
import Footer from "@/components/ui/Footer"
import ListTile from "@/components/ui/ListTile"

export default async function Home() {
  const tiles = await prisma.listTile.findMany({
    orderBy: { updatedAt: "asc" },
    include: {
      items: {
        select: { completed: true, title: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  return (
    <div className="min-h-screen bg-rose-50 font-sans">
      <Header lists={tiles} />
      <main className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 pb-32 pt-28 sm:grid-cols-3">
        {tiles.map((tile) => {
          const remainingNames = tile.items.filter((i) => !i.completed).map((i) => i.title)
          const completedCount = tile.items.filter((i) => i.completed).length
          return (
            <ListTile
              key={tile.id}
              id={tile.id}
              store={tile.store}
              remainingNames={remainingNames}
              totalCount={tile.items.length}
              completedCount={completedCount}
            />
          )
        })}
      </main>
      <Footer />
    </div>
  )
}