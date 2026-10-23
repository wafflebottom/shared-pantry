"use client"

import { useTransition } from "react"
import { lookupMissingPrices } from "@/app/actions"

type Props = {
  listTileID: number
  store: string
  missingCount: number
}

export default function LookupPricesButton({ listTileID, store, missingCount }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const formData = new FormData()
    formData.set("listTileID", String(listTileID))
    startTransition(async () => {
      await lookupMissingPrices(formData)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="mb-4 w-full cursor-pointer rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-rose-800 ring-1 ring-rose-300 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
    >
      {isPending
        ? `Looking up prices at ${store}…`
        : `Look up ${missingCount} missing price${missingCount === 1 ? "" : "s"} at ${store}`}
    </button>
  )
}