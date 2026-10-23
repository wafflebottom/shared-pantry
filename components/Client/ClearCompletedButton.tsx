"use client"

import { deleteCompletedItems } from "../../app/actions"
import { usePendingDelete } from "./PendingDeleteProvider"

export default function ClearCompletedButton({ listTileID, completedIds }: { listTileID: number; completedIds: number[] }) {
  const { stageDeletion } = usePendingDelete()

  function handleClear() {
    const formData = new FormData()
    formData.set("listTileID", String(listTileID))
    stageDeletion({
      ids: completedIds,
      label: `Cleared ${completedIds.length} completed item${completedIds.length === 1 ? "" : "s"}`,
      commit: async () => { await deleteCompletedItems(formData) },
    })
  }

  return (
    <button type="button" onClick={handleClear} className="shrink-0 cursor-pointer text-rose-500 hover:underline">
      Clear
    </button>
  )
}
