"use client"

import { useRef, useTransition } from "react"
import { Check, Trash2, X } from "lucide-react"
import { deleteListTile, updateListTile } from "@/app/actions"
import StoreSelect from "@/components/Client/StoreSelect"

type Props = {
  id: number
  store: string
}

export default function RenameListTitle({ id, store }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [, startTransition] = useTransition()

  // Same delete as the tile dialog on the home grid: a whole list goes with
  // all its items, so it asks first. The store's price book survives.
  const handleDelete = () => {
    if (!window.confirm(`Delete the ${store} list and all its items? This can't be undone.`))
      return
    const formData = new FormData()
    formData.set("id", String(id))
    startTransition(async () => {
      await deleteListTile(formData)
      dialogRef.current?.close()
    })
  }

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
          <StoreSelect defaultValue={store} />

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              aria-label="Delete list"
              onClick={handleDelete}
              className="flex items-center justify-center rounded-full bg-red-100 p-2 text-red-700"
            >
              <Trash2 />
            </button>
            <button
              type="submit"
              aria-label="Save"
              className="flex items-center justify-center rounded-full bg-rose-100 p-2 text-rose-900"
            >
              <Check />
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
