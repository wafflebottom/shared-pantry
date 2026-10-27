"use client"

import { useState, useTransition } from "react"
import { lookupMissingPrices } from "@/app/actions/prices"

type Props = {
  listTileID: number
  store: string
  missingCount: number
}

export default function LookupPricesButton({ listTileID, store, missingCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [failureNote, setFailureNote] = useState<string | null>(null)

  function handleClick() {
    const formData = new FormData()
    formData.set("listTileID", String(listTileID))
    setError(null)
    setFailureNote(null)
    startTransition(async () => {
      try {
        const result = await lookupMissingPrices(formData)
        if (result && result.failed > 0) {
          setFailureNote(
            `${result.failed} of ${result.attempted} price${result.attempted === 1 ? "" : "s"} couldn't be fetched.`
          )
        }
      } catch {
        setError("Price lookup failed — try again.")
      }
    })
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full cursor-pointer rounded-[9px] bg-ck-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-ck-primary/90 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending
          ? `Looking up prices at ${store}…`
          : `Look up ${missingCount} missing price${missingCount === 1 ? "" : "s"} at ${store}`}
      </button>
      {failureNote && <p className="mt-2 text-sm text-amber-700">{failureNote}</p>}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
