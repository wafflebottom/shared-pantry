"use client"

import { useState } from "react"
import { ListX } from "lucide-react"
import { useDeleteMode } from "@/components/Client/DeleteModeProvider"
import { deleteListItems } from "@/app/actions/items"

export default function DeleteButton({ listTileID }: { listTileID?: number }) {
  const { deleteMode, setDeleteMode, selectedIds, clearSelected } = useDeleteMode()
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    if (!deleteMode) {
      setDeleteMode(true)
      return
    }
    if (selectedIds.length > 0) {
      const formData = new FormData()
      formData.append("ids", selectedIds.join(","))
      if (listTileID !== undefined) formData.append("listTileID", String(listTileID))
      try {
        await deleteListItems(formData)
        setError(null)
        clearSelected()
        setDeleteMode(false)
      } catch {
        // Stay in delete mode so the selection can be retried.
        setError("Couldn't delete those items — try again.")
      }
      return
    }
    clearSelected()
    setDeleteMode(false)
  }

  return (
    <>
      <button onClick={onClick} className={deleteMode ? "text-destructive" : ""}>
        <ListX />
        {deleteMode && selectedIds.length > 0 ? selectedIds.length : null}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </>
  )
}
