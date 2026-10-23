"use client"

import { useOptimistic, useRef, useState, useTransition } from "react"
import { Check, CircleCheck, Trash2, X } from "lucide-react"
import { deleteListItem, toggleListItem, updateListItem } from "@/app/actions"
import { predictUnit, UNIT_FORMS } from "@/lib/units"
import { formatPrice } from "@/lib/prices"
import { useDeleteMode } from "./DeleteModeProvider"
import { usePendingDelete } from "./PendingDeleteProvider"

type Props = {
  id: number
  title: string
  brand?: string | null
  qty: number
  unit?: string | null
  completed: boolean
  listTileID: number
  price?: number | null
}

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

export default function ItemRow({ id, title, brand, qty, unit, completed, listTileID, price }: Props) {
  const { deleteMode, selectedIds, toggleSelected } = useDeleteMode()
  const { stageDeletion, isStaged } = usePendingDelete()
  const selected = selectedIds.includes(id)

  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed)
  const [, startTransition] = useTransition()

  const [offset, setOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const justSwipedAt = useRef(0)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLInputElement>(null)
  const lastAutoUnit = useRef(unit ?? "")

  function handleToggle() {
    if (deleteMode) {
      toggleSelected(id)
      return
    }
    startTransition(async () => {
      setOptimisticCompleted(!optimisticCompleted)
      const formData = new FormData()
      formData.set("id", String(id))
      formData.set("listTileID", String(listTileID))
      await toggleListItem(formData)
    })
  }

  function handleRowClick() {
    if (Date.now() - justSwipedAt.current < 350) return
    handleToggle()
  }

  function openEdit() {
    if (deleteMode) return
    dialogRef.current?.showModal()
  }

  function handleDelete() {
    dialogRef.current?.close()
    const formData = new FormData()
    formData.set("id", String(id))
    formData.set("listTileID", String(listTileID))
    stageDeletion({
      ids: [id],
      label: `Deleted "${title}"`,
      commit: async () => {
        await deleteListItem(formData)
      },
    })
  }

  function refreshPrediction() {
    const predicted = predictUnit(titleRef.current?.value ?? "", Number(qtyRef.current?.value) || 1)
    const current = unitRef.current?.value ?? ""
    if (unitRef.current && (current === "" || current.toLowerCase() === lastAutoUnit.current.toLowerCase())) {
      unitRef.current.value = predicted
    }
    lastAutoUnit.current = predicted
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
    if (!deleteMode) {
      longPressTimer.current = setTimeout(() => {
        justSwipedAt.current = Date.now()
        openEdit()
      }, 500)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartX.current
    const dy = touch.clientY - touchStartY.current
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearLongPress()
    if (deleteMode) return
    setOffset(Math.max(-120, Math.min(dx, 120)))
  }

  function handleTouchEnd() {
    clearLongPress()
    if (offset > 70) {
      justSwipedAt.current = Date.now()
      handleToggle()
    } else if (offset < -70) {
      justSwipedAt.current = Date.now()
      handleDelete()
    }
    setOffset(0)
    touchStartX.current = null
    touchStartY.current = null
  }

  if (isStaged(id)) return null

  return (
    <div className="relative isolate mb-px">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg bg-neutral-700">
        {offset > 8 && (
          <CircleCheck
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${
              offset > 70 ? "scale-110 text-white" : "text-neutral-400"
            }`}
          />
        )}
        {offset < -8 && (
          <Trash2
            className={`absolute right-4 top-1/2 -translate-y-1/2 ${
              offset < -70 ? "scale-110 text-white" : "text-neutral-400"
            }`}
          />
        )}
      </div>

      <div
        className={`relative z-10 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-rose-200 ${
          selected ? "bg-red-100" : "bg-white hover:bg-rose-100"
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onClick={handleRowClick}
        onContextMenu={(e) => {
          e.preventDefault()
          openEdit()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          clearLongPress()
          setOffset(0)
        }}
      >
        <input
          type="checkbox"
          checked={deleteMode ? selected : optimisticCompleted}
          onChange={handleToggle}
          onClick={(e) => e.stopPropagation()}
          className={`h-5 w-5 shrink-0 ${deleteMode ? "accent-red-600" : "accent-rose-600"}`}
        />
        <div className="min-w-0 flex-1">
          <span className={optimisticCompleted ? "text-neutral-400 line-through" : ""}>
            {title}
          </span>
          {brand && <span className="text-sm text-neutral-500"> · {brand}</span>}
          <span className="block text-sm text-neutral-500">
            {qty}
            {unit ? ` ${unit}` : ""}
            {price !== null && price !== undefined && ` · ${formatPrice(price)} each`}
          </span>
        </div>
        {price !== null && price !== undefined && (
          <span className="shrink-0 text-sm font-semibold text-neutral-600">
            {formatPrice(price * qty)}
          </span>
        )}
      </div>

      <dialog ref={dialogRef} className="pt-3">
        <div className="flex justify-end">
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close">
            <X />
          </button>
        </div>

        <form
          action={updateListItem}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="listTileID" value={listTileID} />

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Item:</span>
            <input ref={titleRef} name="title" defaultValue={title} onChange={refreshPrediction} className={fieldClass} />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Brand:</span>
            <input name="brand" defaultValue={brand ?? ""} className={fieldClass} />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Qty:</span>
            <input ref={qtyRef} name="qty" type="number" step="any" defaultValue={qty} onChange={refreshPrediction} className={fieldClass} />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Unit:</span>
            <input ref={unitRef} name="unit" defaultValue={unit ?? ""} list={`unit-options-${id}`} className={fieldClass} />
            <datalist id={`unit-options-${id}`}>
              {Object.keys(UNIT_FORMS).map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Price:</span>
            <input name="price" type="number" step="0.01" min="0" defaultValue={price ?? ""} className={fieldClass} />
          </label>

          <div className="mt-10 flex items-center justify-between">
            <button type="button" onClick={handleDelete} aria-label="Delete item" className="cursor-pointer text-red-600">
              <Trash2 />
            </button>
            <button type="submit" aria-label="Save" className="cursor-pointer">
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}