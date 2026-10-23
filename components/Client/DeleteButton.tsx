"use client"

import { ListX } from "lucide-react"
import { useDeleteMode } from "./DeleteModeProvider"
import { deleteListItems } from "../../app/actions"

export default function DeleteButton() {
  const { deleteMode, setDeleteMode, selectedIds, clearSelected, listTileID } = useDeleteMode()

  async function onClick() {
    if (!deleteMode) {
      setDeleteMode(true)
      return
    }
    if (selectedIds.length > 0) {
      const formData = new FormData()
      formData.append("ids", selectedIds.join(","))
      formData.append("listTileID", String(listTileID))
      await deleteListItems(formData)
    }
    clearSelected()
    setDeleteMode(false)
  }

  return (
    <button onClick={onClick} className={deleteMode ? "text-red-600" : ""}>
      <ListX />
      {deleteMode && selectedIds.length > 0 ? selectedIds.length : null}
    </button>
  )
}
