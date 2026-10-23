"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

type PendingBatch = {
  key: number
  ids: number[]
  label: string
  commit: () => Promise<void>
}

type PendingDeleteContextValue = {
  stageDeletion: (batch: Omit<PendingBatch, "key">) => void
  isStaged: (id: number) => boolean
}

const PendingDeleteContext = createContext<PendingDeleteContextValue | null>(null)

export function usePendingDelete() {
  const ctx = useContext(PendingDeleteContext)
  if (!ctx) throw new Error("usePendingDelete must be used inside PendingDeleteProvider")
  return ctx
}

export default function PendingDeleteProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<PendingBatch[]>([])
  const batchesRef = useRef<PendingBatch[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const nextKey = useRef(1)

  const syncBatches = (next: PendingBatch[]) => {
    batchesRef.current = next
    setBatches(next)
  }

  const dropBatch = (key: number) => {
    const t = timers.current.get(key)
    if (t) clearTimeout(t)
    timers.current.delete(key)
    syncBatches(batchesRef.current.filter((b) => b.key !== key))
  }

  const commitBatch = useCallback((key: number) => {
    const batch = batchesRef.current.find((b) => b.key === key)
    if (!batch) return
    dropBatch(key)
    void batch.commit()
  }, [])

  const stageDeletion = useCallback((input: Omit<PendingBatch, "key">) => {
    const key = nextKey.current++
    syncBatches([...batchesRef.current, { ...input, key }])
    timers.current.set(key, setTimeout(() => commitBatch(key), 6000))
  }, [commitBatch])

  const handleUndo = useCallback((key: number) => {
    dropBatch(key)
  }, [])

  useEffect(() => () => {
    for (const t of timers.current.values()) clearTimeout(t)
    for (const b of batchesRef.current) void b.commit()
  }, [])

  const stagedIds = useMemo(
    () => new Set(batches.flatMap((b) => b.ids)),
    [batches]
  )
  const isStaged = useCallback((id: number) => stagedIds.has(id), [stagedIds])

  return (
    <PendingDeleteContext.Provider value={{ stageDeletion, isStaged }}>
      {children}
      {batches.length > 0 && (
        <div className="fixed inset-x-0 bottom-28 z-50 flex flex-col items-center gap-2">
          {batches.map((b) => (
            <div key={b.key} className="flex items-center gap-4 rounded-full bg-neutral-800 px-4 py-2 text-sm text-white shadow-lg">
              <span>{b.label}</span>
              <button type="button" onClick={() => handleUndo(b.key)} className="cursor-pointer font-semibold text-rose-300 hover:underline">
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </PendingDeleteContext.Provider>
  )
}
