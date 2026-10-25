// The household avatar: a dark grey circle with the person's bold initial
// in their profile color.
export default function ProfileAvatar({
  profile,
  size = "sm",
}: {
  profile: { name: string; color: string }
  size?: "sm" | "md"
}) {
  const sizeClass = size === "md" ? "h-9 w-9 text-base" : "h-6 w-6 text-sm"
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-700 font-bold ${sizeClass}`}
      style={{ color: profile.color }}
      title={profile.name}
      aria-label={profile.name}
    >
      {profile.name.charAt(0).toUpperCase()}
    </span>
  )
}
