"use client"

import { useOptimistic, useRef, useState, useTransition } from "react"
import { Check, CircleCheck, Trash2, X } from "lucide-react"
import { deleteListItem, toggleListItem, updateListItem } from "@/app/actions/items"
import { formatPrice } from "@/lib/price-book"
import { UNIT_FORM_OPTIONS, predictUnit } from "@/lib/units"
import { fieldClass, qtyClass } from "@/lib/utils"
import { useDeleteMode } from "@/components/Client/DeleteModeProvider"
import { usePendingDelete } from "@/components/Client/PendingDeleteProvider"
import ProductSearch from "@/components/Client/ProductSearch"
import ProfileAvatar from "@/components/Server/ProfileAvatar"
import { applyProductPick } from "@/components/Client/applyProductPick"
import type { PickerProduct } from "@/lib/price-fetch"

type Attribution = { name: string; color: string } | null

type Props = {
  id: number
  title: string
  brand: string | null
  qty: number
  unit: string | null
  completed: boolean
  listTileID: number
  price: number | null
  requestedBy: Attribution
  checkedOffBy: Attribution
}

export default function ItemRow({
  id,
  title,
  brand,
  qty,
  unit,
  completed,
  listTileID,
  price,
  requestedBy,
  checkedOffBy,
}: Props) {
  const { deleteMode, selectedIds, toggleSelected } = useDeleteMode()
  const { stageDeletion, isStaged } = usePendingDelete()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const brandInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const unitInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const lastAutoUnit = useRef<string>("")
  const [, startTransition] = useTransition()
  const [optimisticCompleted, addOptimistic] = useOptimistic(
    completed,
    (_current: boolean, next: boolean) => next
  )
  const [toggleError, setToggleError] = useState<string | null>(null)

  const [offset, setOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const justSwipedAt = useRef(0)

  const selected = selectedIds.includes(id)

  // Unit prediction runs on input, not in an effect: when the title or qty
  // changes, predict the unit unless the user typed their own (a manual
  // unit is never clobbered). The predicted unit is staged in
  // dataset.newUnit and only saved when the check is tapped.
  const updatePrediction = () => {
    const titleInput = titleInputRef.current
    const qtyInput = qtyInputRef.current
    const unitInput = unitInputRef.current
    if (!titleInput || !qtyInput || !unitInput) return
    const predicted = predictUnit(titleInput.value, Number(qtyInput.value) || 1)
    const current = unitInput.value
    if (predicted && (current === "" || current === lastAutoUnit.current)) {
      unitInput.dataset.newUnit = predicted
      lastAutoUnit.current = predicted
    } else {
      unitInput.dataset.newUnit = current
    }
  }
  const onUnitInput = () => {
    const unitInput = unitInputRef.current
    if (unitInput) unitInput.dataset.newUnit = unitInput.value
  }

  const toggleCompleted = () => {
    startTransition(async () => {
      addOptimistic(!optimisticCompleted)
      setToggleError(null)
      const formData = new FormData()
      formData.set("id", String(id))
      formData.set("listTileID", String(listTileID))
      formData.set("completed", String(optimisticCompleted))
      try {
        await toggleListItem(formData)
      } catch {
        addOptimistic(completed)
        setToggleError("Couldn't update this item — try again.")
      }
    })
  }

  const openEdit = () => dialogRef.current?.showModal()

  const stageThisDeletion = () => {
    const formData = new FormData()
    formData.set("id", String(id))
    formData.set("listTileID", String(listTileID))
    stageDeletion({
      ids: [id],
      label: "Item deleted",
      commit: async () => {
        await deleteListItem(formData)
      },
    })
  }

  const handlePick = (product: PickerProduct) => {
    applyProductPick(product, {
      setTitle: (value) => {
        if (titleInputRef.current) titleInputRef.current.value = value
      },
      setBrand: (value) => {
        if (brandInputRef.current) brandInputRef.current.value = value
      },
      setPrice: (value) => {
        if (priceInputRef.current) priceInputRef.current.value = value
      },
      setQty: (value) => {
        if (qtyInputRef.current) qtyInputRef.current.value = value
      },
      setUnit: (value) => {
        if (unitInputRef.current) {
          unitInputRef.current.value = value
          unitInputRef.current.dataset.newUnit = value
        }
      },
    })
  }

  const handleEditSave = async (formData: FormData) => {
    const newUnit = unitInputRef.current?.dataset.newUnit
    if (newUnit !== undefined) formData.set("unit", newUnit)
    await updateListItem(formData)
    dialogRef.current?.close()
  }

  const handleDialogDelete = () => {
    stageThisDeletion()
    dialogRef.current?.close()
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartX.current = t.clientX
    pressOrigin.current = { x: t.clientX, y: t.clientY }
    cancelLongPress()
    if (!deleteMode) {
      longPressTimer.current = setTimeout(openEdit, 500)
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const t = e.touches[0]
    const origin = pressOrigin.current
    if (
      origin &&
      (Math.abs(t.clientX - origin.x) > 10 || Math.abs(t.clientY - origin.y) > 10)
    ) {
      cancelLongPress()
    }
    const dx = Math.max(-120, Math.min(120, t.clientX - touchStartX.current))
    setOffset(dx)
  }

  const onTouchEnd = () => {
    cancelLongPress()
    touchStartX.current = null
    pressOrigin.current = null
    if (offset > 70) {
      if (!deleteMode) toggleCompleted()
      justSwipedAt.current = Date.now()
    } else if (offset < -70) {
      stageThisDeletion()
      justSwipedAt.current = Date.now()
    }
    setOffset(0)
  }

  const onClick = () => {
    if (Date.now() - justSwipedAt.current < 350) return
    if (deleteMode) toggleSelected(id)
    else toggleCompleted()
  }

  const qtyLabel = `${qty}${unit ? ` ${unit}` : ""}`

  // Who the row is attributed to: the requester while active; the checker
  // once completed — plus the requester too when they differ.
  const showChecker = completed && checkedOffBy != null
  const showRequester =
    requestedBy != null &&
    (!completed || !checkedOffBy || checkedOffBy.name !== requestedBy.name)

  if (isStaged(id)) return null

  return (
    <div className="relative isolate mb-px overflow-hidden rounded-lg bg-neutral-700">
      {Math.abs(offset) > 8 && (
        <>
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-white">
            <CircleCheck className={offset > 70 ? "scale-110" : undefined} />
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-white">
            <Trash2 className={offset < -70 ? "scale-110" : undefined} />
          </span>
        </>
      )}

      <div
        role="button"
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault()
          openEdit()
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`relative flex cursor-pointer items-center gap-3 px-4 py-3 ring-1 ring-ck-border touch-pan-y ${
          selected ? "bg-ck-chip" : "bg-ck-surface"
        }`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <input
          type="checkbox"
          checked={optimisticCompleted}
          onClick={(e) => e.stopPropagation()}
          onChange={toggleCompleted}
          className="h-5 w-5 shrink-0 accent-ck-check"
        />
        <div className="min-w-0 flex-1">
          <p className={optimisticCompleted ? "line-through opacity-50" : undefined}>
            {title}
            {brand && <span className="text-ck-muted"> · {brand}</span>}
          </p>
          <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-ck-muted">
            <span>{qtyLabel}</span>
            {price != null && <span className="font-mono">· {formatPrice(price)} each</span>}
            {showRequester && requestedBy && (
              <span className="inline-flex items-center gap-1">
                · <ProfileAvatar profile={requestedBy} /> {requestedBy.name}
              </span>
            )}
            {showChecker && checkedOffBy && (
              <span className="inline-flex items-center gap-1">
                · ✓ <ProfileAvatar profile={checkedOffBy} /> {checkedOffBy.name}
              </span>
            )}
          </p>
          {toggleError && <p className="text-xs text-destructive">{toggleError}</p>}
        </div>
        {price != null && (
          <span className="shrink-0 font-mono font-bold">{formatPrice(price * qty)}</span>
        )}
      </div>

      <dialog ref={dialogRef}>
        <form action={handleEditSave} className="flex w-[min(92vw,24rem)] flex-col">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="listTileID" value={listTileID} />
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="text-ck-muted"
            >
              <X />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`edit-item-${id}`} className="w-12 shrink-0 text-ck-muted">
              Item
            </label>
            <input
              id={`edit-item-${id}`}
              ref={titleInputRef}
              name="title"
              defaultValue={title}
              onInput={updatePrediction}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={`edit-brand-${id}`} className="w-12 shrink-0 text-ck-muted">
              Brand
            </label>
            <input
              id={`edit-brand-${id}`}
              ref={brandInputRef}
              name="brand"
              defaultValue={brand ?? ""}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={`edit-qty-${id}`} className="w-12 shrink-0 text-ck-muted">
              Qty
            </label>
            <input
              id={`edit-qty-${id}`}
              ref={qtyInputRef}
              name="qty"
              type="number"
              min="0"
              step="any"
              defaultValue={qty}
              onInput={updatePrediction}
              className={qtyClass}
            />
            <label htmlFor={`edit-unit-${id}`} className="shrink-0 text-ck-muted">
              Unit
            </label>
            <input
              id={`edit-unit-${id}`}
              ref={unitInputRef}
              name="unit"
              defaultValue={unit ?? ""}
              list={`unit-forms-edit-${id}`}
              onInput={onUnitInput}
              className={fieldClass}
              autoComplete="off"
            />
            <datalist id={`unit-forms-edit-${id}`}>
              {UNIT_FORM_OPTIONS.map((form) => (
                <option key={form} value={form} />
              ))}
            </datalist>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={`edit-price-${id}`} className="w-12 shrink-0 text-ck-muted">
              Price
            </label>
            <input
              id={`edit-price-${id}`}
              ref={priceInputRef}
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={price ?? ""}
              className={fieldClass}
            />
          </div>

          <ProductSearch listTileID={listTileID} onPick={handlePick} />

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              aria-label="Delete item"
              onClick={handleDialogDelete}
              className="flex items-center justify-center rounded-full bg-destructive/10 p-2 text-destructive"
            >
              <Trash2 />
            </button>
            <button
              type="submit"
              aria-label="Save changes"
              className="flex items-center justify-center rounded-full bg-ck-primary p-2 text-white"
            >
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
