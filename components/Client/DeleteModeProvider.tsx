"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type DeleteModeContextValue = {
  deleteMode: boolean
  setDeleteMode: (value: boolean) => void
  selectedIds: number[]
  toggleSelected: (id: number) => void
  clearSelected: () => void
  listTileID: number
}

const DeleteModeContext = createContext<DeleteModeContextValue | null>(null)

export function DeleteModeProvider({ listTileID, children }: { listTileID: number; children: ReactNode }) {
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  function toggleSelected(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function clearSelected() {
    setSelectedIds([])
  }

  return (
    <DeleteModeContext.Provider value={{ deleteMode, setDeleteMode, selectedIds, toggleSelected, clearSelected, listTileID }}>
      {children}
    </DeleteModeContext.Provider>
  )
}

export function useDeleteMode() {
  const ctx = useContext(DeleteModeContext)
  if (!ctx) throw new Error("useDeleteMode must be used inside DeleteModeProvider")
  return ctx
}