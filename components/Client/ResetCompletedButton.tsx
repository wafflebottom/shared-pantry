"use client"

import { useTransition } from "react"
import { resetCompletedItems } from "../../app/actions"

export default function ResetCompletedButton({ listTileID }: { listTileID: number}) {
  const [, startTransition] = useTransition()

  function handleReset() {
    const formData = new FormData()
    formData.set("listTileID", String(listTileID))
    startTransition(async () => {
      await resetCompletedItems(formData)
    })
  }

  return (
    <button type="button" onClick={handleReset} className="shrink-0 cursor-pointer text-rose-500 hover:underline">
      Reset
    </button>
  )
}
