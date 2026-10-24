"use client"

import { useRef } from "react"
import { Check, Plus, X } from "lucide-react"
import { createListTile } from "@/app/actions"
import StoreSelect from "@/components/Client/StoreSelect"

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
          <StoreSelect />

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
