"use client"

import { useRef } from "react"
import { Check, Plus, X } from "lucide-react"
import { createListTile } from "@/app/actions"
import { STORES } from "@/lib/stores"

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

export default function RequestNewListTile() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="New list"
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
          action={createListTile}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3"
        >
          <label className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-neutral-500">Store:</span>
            <input name="store" list="store-options-new" className={fieldClass} />
            <datalist id="store-options-new">
              {STORES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <div className="mt-10 flex justify-end">
            <button type="submit" aria-label="Create list" className="cursor-pointer">
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}