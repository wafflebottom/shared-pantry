"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { updateListTile } from "@/app/actions"
import { STORES } from "@/lib/stores"

type Props = {
  id: number
  store: string
  remainingNames: string[]
  totalCount: number
  completedCount: number
}

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

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
        className="group flex h-32 cursor-pointer select-none flex-col justify-between rounded-xl bg-rose-100 p-4 ring-1 ring-rose-300 transition-colors [-webkit-touch-callout:none] hover:bg-rose-500"
      >
        <span className="text-lg font-bold leading-snug text-rose-900 group-hover:text-white">
          {store}
        </span>

        <span className="block max-w-full truncate text-sm text-rose-700 group-hover:text-rose-100">
          {totalCount === 0 ? "" : remainingNames.length > 0 ? remainingNames.join(", ") : "All done"}
        </span>

        <span className="text-xs font-medium text-rose-500 group-hover:text-rose-200">
          {totalCount === 0 ? "No items yet" : `${completedCount}/${totalCount} completed`}
        </span>
      </div>

      <dialog ref={dialogRef} className="pt-3 font-sans text-base">
        <div className="flex justify-end">
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close">
            <X />
          </button>
        </div>

        <form
          action={updateListTile}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={id} />
          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Store:</span>
            <input
              name="store"
              defaultValue={store}
              list={`store-options-tile-${id}`}
              className={fieldClass}
            />
            <datalist id={`store-options-tile-${id}`}>
              {STORES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <div className="mt-10 flex justify-end">
            <button type="submit" aria-label="Save" className="cursor-pointer">
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
