"use client"

import { useRef, useState } from "react"
import { Check, Plus, X } from "lucide-react"
import { createListItem } from "@/app/actions/items"
import { UNIT_FORM_OPTIONS, predictUnit } from "@/lib/units"
import { fieldClass, qtyClass } from "@/lib/utils"
import ProductSearch from "@/components/Client/ProductSearch"
import { applyProductPick } from "@/components/Client/applyProductPick"
import type { PickerProduct } from "@/lib/price-fetch"

export default function RequestNewListLine({ listTileID }: { listTileID: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState("")
  const [brand, setBrand] = useState("")
  const [qty, setQty] = useState("1")
  const [unit, setUnit] = useState("")
  const [price, setPrice] = useState("")
  const lastAutoUnit = useRef("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const applyPrediction = (nextTitle: string, nextQty: string) => {
    const predicted = predictUnit(nextTitle, Number(nextQty) || 1)
    if (predicted && (unit === "" || unit === lastAutoUnit.current)) {
      setUnit(predicted)
      lastAutoUnit.current = predicted
    }
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    applyPrediction(value, qty)
  }

  const handleQtyChange = (value: string) => {
    setQty(value)
    applyPrediction(title, value)
  }

  const handlePick = (product: PickerProduct) => {
    applyProductPick(
      product,
      {
        setTitle,
        setBrand,
        setPrice,
        setQty,
        setUnit,
      },
      () => {
        lastAutoUnit.current = ""
      }
    )
  }

  const handleSubmit = async (formData: FormData) => {
    await createListItem(formData)
    setTitle("")
    setBrand("")
    setQty("1")
    setUnit("")
    setPrice("")
    lastAutoUnit.current = ""
    dialogRef.current?.close()
  }

  const openDialog = () => {
    dialogRef.current?.showModal()
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  return (
    <>
      <button
        type="button"
        aria-label="Add item"
        onClick={openDialog}
        className="flex items-center justify-center rounded-full bg-ck-primary p-2 text-white shadow"
      >
        <Plus />
      </button>

      <dialog ref={dialogRef}>
        <form action={handleSubmit} className="flex w-[min(92vw,24rem)] flex-col">
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
            <label htmlFor="add-item" className="w-12 shrink-0 text-ck-muted">
              Item
            </label>
            <input
              id="add-item"
              name="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="add-brand" className="w-12 shrink-0 text-ck-muted">
              Brand
            </label>
            <input
              id="add-brand"
              name="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="add-qty" className="w-12 shrink-0 text-ck-muted">
              Qty
            </label>
            <input
              id="add-qty"
              name="qty"
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={(e) => handleQtyChange(e.target.value)}
              className={qtyClass}
            />
            <label htmlFor="add-unit" className="shrink-0 text-ck-muted">
              Unit
            </label>
            <input
              id="add-unit"
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              list="unit-forms-add"
              className={fieldClass}
              autoComplete="off"
            />
            <datalist id="unit-forms-add">
              {UNIT_FORM_OPTIONS.map((form) => (
                <option key={form} value={form} />
              ))}
            </datalist>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="add-price" className="w-12 shrink-0 text-ck-muted">
              Price
            </label>
            <input
              id="add-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={fieldClass}
            />
          </div>

          <ProductSearch listTileID={listTileID} onPick={handlePick} inputRef={searchInputRef} />

          <div className="mt-10 flex items-center justify-end">
            <button
              type="submit"
              aria-label="Add item"
              className="flex items-center justify-center rounded-full bg-ck-primary p-2 text-white"
            >
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
