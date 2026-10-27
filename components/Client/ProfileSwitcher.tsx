"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { X } from "lucide-react"
import { createProfile, setCurrentProfile } from "@/app/actions/profiles"
import ProfileAvatar from "@/components/Server/ProfileAvatar"
import { DEFAULT_PROFILE_COLOR, PROFILE_COLORS } from "@/lib/profile-colors"
import { fieldClass } from "@/lib/utils"
import type { ProfileDTO } from "@/lib/profiles"

// The device's identity. The first visit on a device opens the picker so
// its owner can claim it; after that the avatar sits in the Header and
// tapping it switches who is acting — or adds a new profile.
export default function ProfileSwitcher({
  profiles,
  currentProfile,
}: {
  profiles: ProfileDTO[]
  currentProfile: ProfileDTO | null
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [, startTransition] = useTransition()
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState<string>(DEFAULT_PROFILE_COLOR)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentProfile && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal()
    }
  }, [currentProfile])

  const choose = (id: number) => {
    const formData = new FormData()
    formData.set("profileId", String(id))
    startTransition(async () => {
      try {
        await setCurrentProfile(formData)
        setError(null)
        dialogRef.current?.close()
      } catch {
        setError("Couldn't switch profiles — try again.")
      }
    })
  }

  const addProfile = () => {
    const name = newName.trim()
    if (!name) return
    const formData = new FormData()
    formData.set("name", name)
    formData.set("color", newColor)
    startTransition(async () => {
      try {
        await createProfile(formData)
        setNewName("")
        setError(null)
        dialogRef.current?.close()
      } catch {
        setError("Couldn't add that profile — try again.")
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={
          currentProfile
            ? `Acting as ${currentProfile.name}`
            : "Choose who is using this device"
        }
        className="cursor-pointer"
      >
        {currentProfile ? (
          <ProfileAvatar profile={currentProfile} size="md" />
        ) : (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-base font-bold text-neutral-300"
            title="Choose a profile"
          >
            ?
          </span>
        )}
      </button>

      <dialog ref={dialogRef} className="pt-3 font-sans text-base">
        <div className="flex justify-end">
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close">
            <X />
          </button>
        </div>
        <p className="mb-3 text-ck-muted">Who&rsquo;s using this device?</p>
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p.id)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-ck-chip"
            >
              <ProfileAvatar profile={p} size="md" />
              <span className="font-medium">{p.name}</span>
              {currentProfile?.id === p.id && (
                <span className="text-sm text-ck-muted">· current</span>
              )}
            </button>
          ))}
        </div>

        <form
          className="mt-4 border-t border-ck-border pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            addProfile()
          }}
        >
          <p className="mb-2 text-ck-muted">Add a profile</p>
          <div className="flex items-center gap-2">
            <ProfileAvatar profile={{ name: newName.trim() || "?", color: newColor }} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              maxLength={24}
              className={fieldClass}
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(PROFILE_COLORS).map(([colorName, hex]) => (
              <button
                key={colorName}
                type="button"
                onClick={() => setNewColor(hex)}
                aria-label={colorName}
                title={colorName}
                className={`h-7 w-7 cursor-pointer rounded-full ${
                  newColor === hex ? "ring-2 ring-ck-primary ring-offset-2" : ""
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!newName.trim()}
              className="cursor-pointer rounded-md bg-ck-primary px-3 py-1 font-medium text-white disabled:cursor-default disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
