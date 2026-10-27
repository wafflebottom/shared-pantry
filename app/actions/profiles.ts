"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { claimProfileCookie } from "@/lib/profiles"
import { DEFAULT_PROFILE_COLOR, PROFILE_COLORS } from "@/lib/profile-colors"
import { formId, formString } from "@/app/actions/helpers"

// Claims this device for a profile: the cookie is how the server knows
// who is acting from then on.
export async function setCurrentProfile(formData: FormData) {
  const id = formId(formData, "profileId")
  if (!id) return
  const profile = await prisma.profile.findUnique({ where: { id } })
  if (!profile) return
  await claimProfileCookie(id)
  revalidatePath("/", "layout")
}

// Adds a profile and claims this device for it. Adding a name that
// already exists just claims that profile instead of erroring on the
// unique constraint.
export async function createProfile(formData: FormData) {
  const name = formString(formData, "name")
  const color = formString(formData, "color")
  if (!name) return
  const validColor = (Object.values(PROFILE_COLORS) as string[]).includes(color)
    ? color
    : DEFAULT_PROFILE_COLOR

  // Case-insensitive lookup preserves the old claim behaviour: adding
  // "simon" claims the existing "Simon" profile instead of creating a
  // duplicate. The upsert on the found exact name keeps the race fix.
  const existingProfile = await prisma.profile.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  const profile = await prisma.profile.upsert({
    where: { name: existingProfile?.name ?? name },
    create: { name, color: validColor },
    update: {},
  })

  await claimProfileCookie(profile.id)
  revalidatePath("/", "layout")
}
