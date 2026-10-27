"use client"

import { useRef } from "react"
import ListTileEditDialog from "@/components/Client/ListTileEditDialog"

type Props = {
  id: number
  store: string
}

export default function RenameListTitle({ id, store }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="cursor-pointer font-serif text-[26px] text-ck-ink sm:text-[28px]"
      >
        {store}
      </button>

      <ListTileEditDialog id={id} store={store} dialogRef={dialogRef} />
    </>
  )
}
