import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { PROFILE_COLORS } from "@/lib/profile-colors"

export const PROFILE_COOKIE = "sp-profile"

export type ProfileDTO = { id: number; name: string; color: string }

// The household profiles. Simon is rose, Rachel is teal — change the hex
// here (or the row in the DB) to change a person's color.
const SEED_PROFILES: { name: string; color: string }[] = [
  { name: "Simon", color: PROFILE_COLORS.Rose },
  { name: "Rachel", color: PROFILE_COLORS.Teal },
]

// Every profile in the table. Seeds Simon + Rachel the first time the
// table is empty; upserts by name so concurrent first loads can't
// duplicate them.
export async function getProfiles(): Promise<ProfileDTO[]> {
  const count = await prisma.profile.count()
  if (count === 0) {
    for (const p of SEED_PROFILES) {
      await prisma.profile.upsert({
        where: { name: p.name },
        create: p,
        update: {},
      })
    }
  }
  return prisma.profile.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, color: true },
  })
}

// The profile this device is acting as, from the cookie set when the
// device's owner picked their profile. Null until a profile is chosen.
export async function getCurrentProfile(): Promise<ProfileDTO | null> {
  const jar = await cookies()
  const id = Number(jar.get(PROFILE_COOKIE)?.value)
  if (!id) return null
  const profiles = await getProfiles()
  return profiles.find((p) => p.id === id) ?? null
}
