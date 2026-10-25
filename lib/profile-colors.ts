// The palette a profile's color comes from — the avatar letter is drawn
// in it on a dark grey circle, so every color here is picked to read on
// dark grey. Both the picker (client) and the create action (server)
// read this one list.
export const PROFILE_COLORS = {
  Rose: "#f43f5e",
  Teal: "#14b8a6",
  Amber: "#f59e0b",
  Sky: "#0ea5e9",
  Violet: "#8b5cf6",
  Green: "#22c55e",
  Orange: "#f97316",
  Pink: "#ec4899",
} as const

export const DEFAULT_PROFILE_COLOR = PROFILE_COLORS.Rose
