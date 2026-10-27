import { prisma } from "@/lib/prisma"
import Header from "@/components/Server/Header"
import Footer from "@/components/Server/Footer"
import ListTile from "@/components/Client/ListTile"

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
    <div className="min-h-screen bg-ck-bg font-sans lg:pl-56">
      <Header lists={tiles} />
      <main className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 pb-32 pt-28 sm:grid-cols-3">
        {tiles.map((tile) => {
          const remainingNames: string[] = []
          let completedCount = 0
          for (const item of tile.items) {
            if (item.completed) completedCount += 1
            else remainingNames.push(item.title)
          }
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
