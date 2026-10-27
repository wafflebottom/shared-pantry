"use client"

import { useTransition, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { createListTile } from "@/app/actions/lists"
import StoreSelect from "@/components/Client/StoreSelect"

// The shared create-list dialog: the Footer's "+" button and the nav
// drawer's "New list" row both open one of these. Creating a list
// navigates straight to it so the list can be built immediately.
export default function CreateListDialog({
  dialogRef,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const id = await createListTile(formData)
      if (!id) return
      dialogRef.current?.close()
      router.push(`/list-item/${id}`)
    })
  }

  return (
    <dialog ref={dialogRef} className="pt-3 font-sans text-base">
      <div className="flex justify-end">
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close">
          <X />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <StoreSelect />

        <div className="mt-10 flex justify-end">
          <button type="submit" aria-label="Create list" className="flex cursor-pointer items-center justify-center rounded-full bg-ck-primary p-2 text-white">
            <Check />
          </button>
        </div>
      </form>
    </dialog>
  )
}
