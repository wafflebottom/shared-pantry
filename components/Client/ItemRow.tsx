"use client"

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react"
import { Check, CircleCheck, Trash2, X } from "lucide-react"
import { deleteListItem, toggleListItem, updateListItem } from "@/app/actions"
import { formatPrice } from "@/lib/prices"
import { UNIT_FORMS, predictUnit } from "@/lib/units"
import { useDeleteMode } from "@/components/Client/DeleteModeProvider"
import { usePendingDelete } from "@/components/Client/PendingDeleteProvider"
import ProductSearch from "@/components/Client/ProductSearch"
import type { PickerProduct } from "@/lib/price-fetch"

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

const unitForms = [...new Set(Object.values(UNIT_FORMS).flat())]

type Props = {
  id: number
  title: string
  brand: string | null
  qty: number
  unit: string | null
  completed: boolean
  listTileID: number
  price: number | null
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

  const [offset, setOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const justSwipedAt = useRef(0)

  const selected = selectedIds.includes(id)

  useEffect(() => {
    const titleInput = titleInputRef.current
    const qtyInput = qtyInputRef.current
    const unitInput = unitInputRef.current
    if (!titleInput || !qtyInput || !unitInput) return

    const updatePrediction = () => {
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
      unitInput.dataset.newUnit = unitInput.value
    }
    titleInput.addEventListener("input", updatePrediction)
    qtyInput.addEventListener("input", updatePrediction)
    unitInput.addEventListener("input", onUnitInput)
    return () => {
      titleInput.removeEventListener("input", updatePrediction)
      qtyInput.removeEventListener("input", updatePrediction)
      unitInput.removeEventListener("input", onUnitInput)
    }
  }, [])

  const toggleCompleted = () => {
    startTransition(async () => {
      addOptimistic(!optimisticCompleted)
      const formData = new FormData()
      formData.set("id", String(id))
      formData.set("listTileID", String(listTileID))
      await toggleListItem(formData)
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
    // A pick adopts the product's identity — title, brand, size, and price
    // when the store serves one. A priceless pick leaves the price field
    // untouched. The fields stay editable, and nothing saves until the
    // check is tapped.
    if (titleInputRef.current) titleInputRef.current.value = product.title
    if (brandInputRef.current) brandInputRef.current.value = product.brand ?? ""
    if (priceInputRef.current && product.price != null) {
      priceInputRef.current.value = product.price.toFixed(2)
    }
    if (product.itemQty != null && product.itemUnit) {
      if (qtyInputRef.current) qtyInputRef.current.value = String(product.itemQty)
      if (unitInputRef.current) {
        unitInputRef.current.value = product.itemUnit
        unitInputRef.current.dataset.newUnit = product.itemUnit
      }
    }
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
        className={`relative flex cursor-pointer items-center gap-3 px-4 py-3 ring-1 ring-rose-200 touch-pan-y ${
          selected ? "bg-red-100" : "bg-white"
        }`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <input
          type="checkbox"
          checked={optimisticCompleted}
          onClick={(e) => e.stopPropagation()}
          onChange={toggleCompleted}
          className="h-5 w-5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className={optimisticCompleted ? "line-through opacity-60" : undefined}>
            {title}
            {brand && <span className="text-neutral-500"> · {brand}</span>}
          </p>
          <p className="text-sm text-neutral-500">
            {qtyLabel}
            {price != null && ` · ${formatPrice(price)} each`}
          </p>
        </div>
        {price != null && (
          <span className="shrink-0 font-medium">{formatPrice(price * qty)}</span>
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
              className="text-neutral-500"
            >
              <X />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`edit-item-${id}`} className="w-12 shrink-0 text-neutral-500">
              Item
            </label>
            <input
              id={`edit-item-${id}`}
              ref={titleInputRef}
              name="title"
              defaultValue={title}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={`edit-brand-${id}`} className="w-12 shrink-0 text-neutral-500">
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
            <label htmlFor={`edit-qty-${id}`} className="w-12 shrink-0 text-neutral-500">
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
              className="w-20 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"
            />
            <label htmlFor={`edit-unit-${id}`} className="shrink-0 text-neutral-500">
              Unit
            </label>
            <input
              id={`edit-unit-${id}`}
              ref={unitInputRef}
              name="unit"
              defaultValue={unit ?? ""}
              list={`unit-forms-edit-${id}`}
              className={fieldClass}
              autoComplete="off"
            />
            <datalist id={`unit-forms-edit-${id}`}>
              {unitForms.map((form) => (
                <option key={form} value={form} />
              ))}
            </datalist>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={`edit-price-${id}`} className="w-12 shrink-0 text-neutral-500">
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
              className="flex items-center justify-center rounded-full bg-red-100 p-2 text-red-700"
            >
              <Trash2 />
            </button>
            <button
              type="submit"
              aria-label="Save changes"
              className="flex items-center justify-center rounded-full bg-rose-100 p-2 text-rose-900"
            >
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
