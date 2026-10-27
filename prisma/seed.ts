import { PrismaClient } from "@prisma/client"
import { itemKeyFor } from "@/lib/price-book"
import { PROFILE_COLORS } from "@/lib/profile-colors"

const prisma = new PrismaClient()

// Every settable field is filled: brand (null only where a product
// genuinely has none), qty + unit, a StorePrice row so the header
// estimate and per-unit prices show, a requester on every item, and a
// checker on every completed item. Prices are sample values.
type SeedItem = {
  title: string
  brand?: string | null
  qty?: number
  unit?: string | null
  price?: number | null
  completed?: boolean
  requestedBy?: "Simon" | "Rachel"
  checkedOffBy?: "Simon" | "Rachel"
}

const SEED: { store: string; items: SeedItem[] }[] = [
  {
    store: "King Soopers",
    items: [
      { title: "Bananas", brand: "Dole", qty: 1, unit: "bunch", price: 0.89, requestedBy: "Simon" },
      { title: "Milk", brand: "Organic Valley", qty: 1, unit: "gal", price: 5.99, requestedBy: "Rachel" },
      { title: "Eggs", brand: "Vital Farms", qty: 1, unit: "dozen", price: 6.49, requestedBy: "Simon" },
      { title: "Bread", brand: "Outside the Breadbox", qty: 2, unit: "loaves", price: 3.99, requestedBy: "Rachel" },
      { title: "Tuna Fish", brand: "StarKist", qty: 3, unit: "cans", price: 1.89, requestedBy: "Simon" },
      { title: "Strawberries", brand: "Driscoll's", qty: 2, unit: "containers", price: 4.49, requestedBy: "Rachel" },
      { title: "Ground Beef", brand: "Kroger", qty: 1.5, unit: "lbs", price: 5.99, requestedBy: "Simon" },
      { title: "Cheese", brand: "Tillamook", qty: 1, unit: "pack", price: 6.99, requestedBy: "Rachel" },
      { title: "Fresh Basil", qty: 1, unit: "bunch", price: 2.49, requestedBy: "Simon" },
      { title: "Rice", brand: "Mahatma", qty: 1, unit: "bag", price: 3.99, completed: true, requestedBy: "Rachel", checkedOffBy: "Simon" },
      { title: "Coffee", brand: "Peet's", qty: 1, unit: "bag", price: 12.99, completed: true, requestedBy: "Simon", checkedOffBy: "Rachel" },
      { title: "Olive Oil", brand: "Bertolli", qty: 1, unit: "bottle", price: 9.99, completed: true, requestedBy: "Rachel", checkedOffBy: "Simon" },
    ],
  },
  {
    store: "Costco",
    items: [
      { title: "Toilet Paper", brand: "Kirkland Signature", qty: 1, unit: "pack", price: 19.99, requestedBy: "Simon" },
      { title: "Paper Towels", brand: "Kirkland Signature", qty: 2, unit: "packs", price: 21.99, requestedBy: "Rachel" },
      { title: "Detergent", brand: "Tide", qty: 1, unit: "bottle", price: 24.99, requestedBy: "Simon" },
      { title: "Chicken Breast", brand: "Kirkland Signature", qty: 4, unit: "lbs", price: 3.49, requestedBy: "Rachel" },
      { title: "Almonds", brand: "Kirkland Signature", qty: 1, unit: "bag", price: 13.99, requestedBy: "Simon" },
      { title: "Frozen Peas", brand: "Kirkland Signature", qty: 1, unit: "bag", price: 8.99, completed: true, requestedBy: "Rachel", checkedOffBy: "Simon" },
    ],
  },
  {
    store: "Farmers Market",
    items: [
      { title: "Tomatoes", qty: 2, unit: "lbs", price: 2.49, requestedBy: "Simon" },
      { title: "Corn", qty: 6, unit: "ears", price: 0.79, requestedBy: "Rachel" },
      { title: "Lettuce", qty: 1, unit: "head", price: 2.99, requestedBy: "Simon" },
      { title: "Avocados", qty: 4, unit: "ea", price: 1.99, requestedBy: "Rachel" },
      { title: "Peaches", qty: 1, unit: "lbs", price: 3.49, requestedBy: "Simon" },
      { title: "Honey", brand: "Heavenly Organics", qty: 1, unit: "jar", price: 12.99, completed: true, requestedBy: "Rachel", checkedOffBy: "Simon" },
      { title: "Bread", qty: 1, unit: "loaf", price: 7.99, completed: true, requestedBy: "Simon", checkedOffBy: "Rachel" },
    ],
  },
  {
    store: "Target",
    items: [
      { title: "Toothpaste", brand: "Colgate", qty: 1, unit: "tube", price: 4.99, requestedBy: "Simon" },
      { title: "Shampoo", brand: "Pantene", qty: 1, unit: "bottle", price: 6.99, requestedBy: "Rachel" },
      { title: "Dish Soap", brand: "Dawn", qty: 2, unit: "bottles", price: 3.49, requestedBy: "Simon" },
      { title: "Birthday Candles", qty: 1, unit: "pack", price: 2.99, requestedBy: "Rachel" },
      { title: "Gift Wrap", qty: 1, unit: "roll", price: 5.99, completed: true, requestedBy: "Simon", checkedOffBy: "Rachel" },
    ],
  },
]

async function main() {
  // Wipes the lists and the price book. Profiles are NOT deleted:
  // devices identify themselves by profile id, so deleting them
  // would unclaim every device.
  await prisma.storePrice.deleteMany()
  await prisma.listItem.deleteMany()
  await prisma.listTile.deleteMany()

  const simon = await prisma.profile.upsert({
    where: { name: "Simon" },
    create: { name: "Simon", color: PROFILE_COLORS.Rose },
    update: {},
  })
  const rachel = await prisma.profile.upsert({
    where: { name: "Rachel" },
    create: { name: "Rachel", color: PROFILE_COLORS.Teal },
    update: {},
  })
  const byName = { Simon: simon, Rachel: rachel }

  const priceRows: { store: string; itemKey: string; price: number; unit: string | null }[] = []

  for (const list of SEED) {
    await prisma.listTile.create({
      data: {
        store: list.store,
        items: {
          create: list.items.map((item) => ({
            title: item.title,
            brand: item.brand ?? null,
            qty: item.qty ?? 1,
            unit: item.unit ?? null,
            completed: item.completed ?? false,
            // Relation FKs are read-only in create data, so the
            // requester/checker are stamped via connect, not by id.
            requestedBy: item.requestedBy ? { connect: { id: byName[item.requestedBy].id } } : undefined,
            checkedOffBy: item.checkedOffBy ? { connect: { id: byName[item.checkedOffBy].id } } : undefined,
          })),
        },
      },
    })

    for (const item of list.items) {
      if (item.price != null) {
        priceRows.push({
          store: list.store,
          itemKey: itemKeyFor(item.title, item.brand ?? null),
          price: item.price,
          unit: item.unit ?? null,
        })
      }
    }
  }

  if (priceRows.length > 0) await prisma.storePrice.createMany({ data: priceRows })

  console.log(`Seed complete: ${SEED.length} lists, ${SEED.flatMap((l) => l.items).length} items, ${priceRows.length} prices`)
}

main().finally(() => prisma.$disconnect())
