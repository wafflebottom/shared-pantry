This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Shared Pantry

A shared grocery-list web app for households. Lists are organized by store,
items can carry brands and per-store prices, and every list shows a running
estimated total you can check against the receipt at checkout.

## Features

- One list per store (Sprouts, Natural Grocers, Whole Foods, Costco, and more)
- Add / edit / check off items with quantities, units, and brands
- Gmail-style interactions: swipe right to complete, swipe left to delete,
  undo toasts with deferred commit, long-press / right-click to edit
- Per-store price book: prices are stored once per store + item and shared
  across lists, with per-unit pricing shown on every row
- Header total with priced-item coverage, visible while scrolling
- Multi-device: all clients share one hosted database and auto-refresh

## Tech

Next.js (App Router, Server Actions) · TypeScript · Prisma + PostgreSQL ·
Tailwind CSS · Lucide icons

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres database
3. `npx prisma db push`
4. `npm run dev` (add `-- --hostname 0.0.0.0` to test on a phone over LAN)


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
