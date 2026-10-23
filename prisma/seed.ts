import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  await prisma.storePrice.deleteMany()
  await prisma.listItem.deleteMany()
  await prisma.listTile.deleteMany()

  await prisma.listTile.create({
    data: {
      store: "King Soopers",
      items: {
        create: [
          { title: "Bananas", qty: 1, unit: "bunch" },
          { title: "Milk", qty: 1, unit: "gal" },
          { title: "Eggs", qty: 1, unit: "dozen" },
          { title: "Bread", qty: 2, unit: "loaves" },
          { title: "Tuna Fish", qty: 3, unit: "cans" },
          { title: "Strawberries", qty: 2, unit: "containers" },
          { title: "Ground Beef", qty: 1.5, unit: "lbs" },
          { title: "Cheese", qty: 1, unit: "pack" },
          { title: "Fresh Basil", qty: 1 },
          { title: "Rice", qty: 1, completed: true },
          { title: "Coffee", qty: 1, completed: true },
          { title: "Olive Oil", qty: 1, completed: true },
        ],
      },
    },
  })

  await prisma.listTile.create({
    data: {
      store: "Costco",
      items: {
        create: [
          { title: "Toilet Paper", qty: 1 },
          { title: "Paper Towels", qty: 2, unit: "packs" },
          { title: "Detergent", qty: 1 },
          { title: "Chicken Breast", qty: 4, unit: "lbs" },
          { title: "Almonds", qty: 1 },
          { title: "Frozen Peas", qty: 1, completed: true },
        ],
      },
    },
  })

  await prisma.listTile.create({
    data: {
      store: "Farmers Market",
      items: {
        create: [
          { title: "Tomatoes", qty: 2, unit: "lbs" },
          { title: "Corn", qty: 6, unit: "ears" },
          { title: "Lettuce", qty: 1, unit: "head" },
          { title: "Avocados", qty: 4, unit: "ea" },
          { title: "Peaches", qty: 1, unit: "lbs" },
          { title: "Honey", qty: 1, completed: true },
          { title: "Bread", qty: 1, unit: "loaf", completed: true },
        ],
      },
    },
  })

  await prisma.listTile.create({
    data: {
      store: "Target",
      items: {
        create: [
          { title: "Toothpaste", qty: 1 },
          { title: "Shampoo", qty: 1 },
          { title: "Dish Soap", qty: 2, unit: "bottles" },
          { title: "Birthday Candles", qty: 1 },
          { title: "Gift Wrap", qty: 1, completed: true },
        ],
      },
    },
  })

  console.log("Seed complete")
}

main().finally(() => prisma.$disconnect())