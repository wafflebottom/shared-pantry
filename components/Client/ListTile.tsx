"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import ListTileEditDialog from "@/components/Client/ListTileEditDialog"

type Props = {
  id: number
  store: string
  remainingNames: string[]
  totalCount: number
  completedCount: number
}

export default function ListTile({ id, store, remainingNames, totalCount, completedCount }: Props) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justLongPressedAt = useRef(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  function openEdit() {
    dialogRef.current?.showModal()
  }

  function handleClick() {
    if (Date.now() - justLongPressedAt.current < 350) return
    router.push(`/list-item/${id}`)
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      justLongPressedAt.current = Date.now()
      openEdit()
    }, 500)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const touch = e.touches[0]
    if (
      Math.abs(touch.clientX - touchStartX.current) > 10 ||
      Math.abs(touch.clientY - touchStartY.current) > 10
    ) {
      clearLongPress()
    }
  }

  function handleTouchEnd() {
    clearLongPress()
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div className="relative">
      <div
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          openEdit()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="group flex h-32 cursor-pointer select-none flex-col justify-between rounded-xl border-t-4 border-t-ck-primary bg-ck-surface p-4 ring-1 ring-ck-border transition-colors [-webkit-touch-callout:none] hover:bg-ck-chip"
      >
        <span className="font-serif text-lg leading-snug text-ck-ink">
          {store}
        </span>

        <span className="block max-w-full truncate text-sm text-ck-muted">
          {totalCount === 0 ? "" : remainingNames.length > 0 ? remainingNames.join(", ") : "All done"}
        </span>

        <span className="text-xs font-medium text-ck-muted">
          {totalCount === 0 ? "No items yet" : `${completedCount}/${totalCount} completed`}
        </span>
      </div>

      <ListTileEditDialog id={id} store={store} dialogRef={dialogRef} />
    </div>
  )
}
