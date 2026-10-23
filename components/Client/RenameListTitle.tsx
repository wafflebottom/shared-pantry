"use client"

import { useRef } from "react"
import { Check, X } from "lucide-react"
import { updateListTile } from "@/app/actions"
import { STORES } from "@/lib/stores"

type Props = {
  id: number
  store: string
}

const fieldClass =
  "flex-1 rounded-md bg-neutral-100 px-2 py-1 outline-none focus:bg-white focus:ring-1 focus:ring-rose-300"

export default function RenameListTitle({ id, store }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="cursor-pointer text-2xl font-extrabold uppercase text-rose-900"
      >
        {store}
      </button>

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
              list="store-options"
              className={fieldClass}
            />
            <datalist id="store-options">
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
    </>
  )
}