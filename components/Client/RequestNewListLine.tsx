"use client"

import { usePathname } from "next/navigation"
import { useRef } from "react"
import { Check, Plus, X } from "lucide-react"
import { createListItem } from "@/app/actions"
import { predictUnit, UNIT_FORMS } from "@/lib/units"

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

export default function RequestNewListLine() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  const segments = pathname?.split("/") ?? []
  const listTileID = segments[segments.length - 1]

  const titleRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLInputElement>(null)
  const lastAutoUnit = useRef("")

  function refreshPrediction() {
    const predicted = predictUnit(titleRef.current?.value ?? "", Number(qtyRef.current?.value) || 1)
    const current = unitRef.current?.value ?? ""
    if (unitRef.current && (current === "" || current.toLowerCase() === lastAutoUnit.current.toLowerCase())) {
      unitRef.current.value = predicted
    }
    lastAutoUnit.current = predicted
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Add item"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#a50036] hover:bg-rose-400"
      >
        <Plus />
      </button>

      <dialog ref={dialogRef} className="pt-3 font-sans text-base">
        <div className="flex justify-end">
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close">
            <X />
          </button>
        </div>

        <form
          action={createListItem}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="listTileID" value={listTileID} />

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Item:</span>
            <input ref={titleRef} name="title" onChange={refreshPrediction} className={fieldClass} />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Brand:</span>
            <input name="brand" className={fieldClass} />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Qty:</span>
            <input ref={qtyRef} name="qty" type="number" step="any" defaultValue={1} onChange={refreshPrediction} className={fieldClass} />
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Unit:</span>
            <input ref={unitRef} name="unit" list="unit-options" className={fieldClass} />
            <datalist id="unit-options">
              {Object.keys(UNIT_FORMS).map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Price:</span>
            <input name="price" type="number" step="0.01" min="0" className={fieldClass} />
          </label>

          <div className="mt-10 flex justify-end">
            <button type="submit" aria-label="Add item" className="cursor-pointer">
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}