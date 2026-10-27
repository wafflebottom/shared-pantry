"use client"

import { useOptimistic, useState, useTransition } from "react"
import { setFullListInclude } from "@/app/actions/lists"

type Props = {
  listTileID: number
  store: string
  included: boolean
}

export default function FullListToggle({ listTileID, store, included }: Props) {
  const [, startTransition] = useTransition()
  const [optimisticIncluded, setOptimisticIncluded] = useOptimistic(
    included,
    (_current: boolean, next: boolean) => next
  )
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    const next = !optimisticIncluded
    startTransition(async () => {
      setOptimisticIncluded(next)
      setError(null)
      const formData = new FormData()
      formData.set("id", String(listTileID))
      formData.set("include", String(next))
      try {
        await setFullListInclude(formData)
      } catch {
        setOptimisticIncluded(included)
        setError("Couldn't update this list — try again.")
      }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-ck-ink">{store}</span>
        <button
          type="button"
          role="switch"
          aria-checked={optimisticIncluded}
          aria-label={`Include ${store} in the Full List`}
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            optimisticIncluded ? "bg-ck-check" : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              optimisticIncluded ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {error && <p className="px-4 pb-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
