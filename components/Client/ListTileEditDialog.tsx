"use client"

import { useTransition, type RefObject } from "react"
import { Check, Trash2, X } from "lucide-react"
import { deleteListTile, updateListTile } from "@/app/actions/lists"
import StoreSelect from "@/components/Client/StoreSelect"

type Props = {
  id: number
  store: string
  dialogRef: RefObject<HTMLDialogElement | null>
}

// The shared edit-list dialog: the home tile (long-press / right-click)
// and the list page's title button open the same dialog — a store picker,
// a delete button, and a save button. Only the trigger differs.
export default function ListTileEditDialog({ id, store, dialogRef }: Props) {
  const [, startTransition] = useTransition()

  // Deleting a whole list is destructive (all its items go with it), so it
  // asks first — the same deliberate window.confirm Reset Completed uses.
  // The store's price book survives: it is keyed by store name, not tile.
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
            className="flex items-center justify-center rounded-full bg-destructive/10 p-2 text-destructive"
          >
            <Trash2 />
          </button>
          <button
            type="submit"
            aria-label="Save"
            className="flex items-center justify-center rounded-full bg-ck-primary p-2 text-white"
          >
            <Check />
          </button>
        </div>
      </form>
    </dialog>
  )
}
