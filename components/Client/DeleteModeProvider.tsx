"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

type DeleteModeContextValue = {
  deleteMode: boolean
  setDeleteMode: (value: boolean) => void
  selectedIds: number[]
  toggleSelected: (id: number) => void
  clearSelected: () => void
}

const DeleteModeContext = createContext<DeleteModeContextValue | null>(null)

// No listTileID here: the provider only tracks bulk-delete mode/selection.
// The list id is passed as a prop to DeleteButton, which is the only
// consumer that needs it.
export function DeleteModeProvider({ children }: { children: ReactNode }) {
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const clearSelected = useCallback(() => {
    setSelectedIds([])
  }, [])

  const value = useMemo(
    () => ({ deleteMode, setDeleteMode, selectedIds, toggleSelected, clearSelected }),
    [deleteMode, selectedIds, toggleSelected, clearSelected]
  )

  return (
    <DeleteModeContext.Provider value={value}>
      {children}
    </DeleteModeContext.Provider>
  )
}

export function useDeleteMode() {
  const ctx = useContext(DeleteModeContext)
  if (!ctx) throw new Error("useDeleteMode must be used inside DeleteModeProvider")
  return ctx
}
