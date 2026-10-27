// lib/units.ts

// Item name (lowercase, singular) -> unit key
const ITEM_UNITS: Record<string, string> = {
  banana: "bunch",
  bread: "loaf",
  loaf: "loaf",
  egg: "dozen",
  milk: "gal",
  "orange juice": "carton",
  "half and half": "carton",
  cheese: "pack",
  butter: "pack",
  bacon: "pack",
  sausage: "pack",
  beer: "pack",
  yogurt: "container",
  oat: "container",
  strawberry: "container",
  blueberry: "container",
  raspberry: "container",
  blackberry: "container",
  "ice cream": "tub",
  "tuna fish": "can",
  tuna: "can",
  soup: "can",
  soda: "can",
  cereal: "box",
  pasta: "box",
  cracker: "box",
  rice: "bag",
  flour: "bag",
  sugar: "bag",
  coffee: "bag",
  chip: "bag",
  spinach: "bag",
  salad: "bag",
  almond: "bag",
  cherry: "bag",
  "frozen peas": "bag",
  "olive oil": "bottle",
  wine: "bottle",
  juice: "bottle",
  "dish soap": "bottle",
  shampoo: "bottle",
  detergent: "bottle",
  "peanut butter": "jar",
  jelly: "jar",
  jam: "jar",
  pickle: "jar",
  salsa: "jar",
  honey: "jar",
  apple: "lb",
  tomato: "lb",
  potato: "lb",
  onion: "lb",
  carrot: "lb",
  grape: "lb",
  "ground beef": "lb",
  "ground turkey": "lb",
  "chicken breast": "lb",
  steak: "lb",
  salmon: "lb",
  lettuce: "head",
  cabbage: "head",
  garlic: "head",
  celery: "stalk",
  corn: "ear",
  avocado: "ea",
  lemon: "ea",
  lime: "ea",
  cucumber: "ea",
  "bell pepper": "ea",
  "toilet paper": "roll",
  "paper towels": "roll",
  toothpaste: "tube",
}

// Unit key -> [singular, plural]. Abbreviations and "dozen" don't change.
export const UNIT_FORMS: Record<string, [string, string]> = {
  bunch: ["bunch", "bunches"],
  loaf: ["loaf", "loaves"],
  lb: ["lb", "lbs"],
  oz: ["oz", "oz"],
  g: ["g", "g"],
  kg: ["kg", "kg"],
  gal: ["gal", "gal"],
  dozen: ["dozen", "dozen"],
  ea: ["ea", "ea"],
  can: ["can", "cans"],
  box: ["box", "boxes"],
  bag: ["bag", "bags"],
  bottle: ["bottle", "bottles"],
  jar: ["jar", "jars"],
  pack: ["pack", "packs"],
  carton: ["carton", "cartons"],
  container: ["container", "containers"],
  roll: ["roll", "rolls"],
  head: ["head", "heads"],
  clove: ["clove", "cloves"],
  stalk: ["stalk", "stalks"],
  ear: ["ear", "ears"],
  tub: ["tub", "tubs"],
  tube: ["tube", "tubes"],
}

// Every distinct singular/plural unit form, for the unit datalists in the
// add/edit dialogs (was duplicated in ItemRow and RequestNewListLine).
export const UNIT_FORM_OPTIONS = [...new Set(Object.values(UNIT_FORMS).flat())]

// Pluralize a unit that isn't in UNIT_FORMS (fallback rules).
function pluralize(word: string): string {
  if (/(s|x|z|ch|sh)$/.test(word)) return word + "es"
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + "ies"
  if (/fe$/.test(word)) return word.slice(0, -2) + "ves"
  if (/f$/.test(word)) return word.slice(0, -1) + "ves"
  return word + "s"
}

export function formatUnit(unit: string, qty: number): string {
  const forms = UNIT_FORMS[unit]
  if (qty === 1) return forms ? forms[0] : unit
  return forms ? forms[1] : pluralize(unit)
}

// Candidate singular forms of a word, most specific transformation first.
// Wrong guesses are harmless — the dictionary check rejects them.
function singularForms(word: string): string[] {
  const forms = [word]
  if (word.endsWith("ies")) forms.push(word.slice(0, -3) + "y")
  if (word.endsWith("ves")) {
    forms.push(word.slice(0, -3) + "f")
    forms.push(word.slice(0, -3) + "fe")
  }
  if (word.endsWith("es")) forms.push(word.slice(0, -2))
  if (word.endsWith("s")) forms.push(word.slice(0, -1))
  return forms
}

function lookupUnit(title: string): string | null {
  const normalized = title.trim().toLowerCase()
  if (!normalized) return null

  const words = normalized.split(/\s+/)
  const lastWord = words[words.length - 1]

  const candidates = [...singularForms(normalized)]
  if (words.length > 1) candidates.push(...singularForms(lastWord))

  for (const c of candidates) {
    if (ITEM_UNITS[c]) return ITEM_UNITS[c]
  }
  return null
}

// Predict the unit for an item title at a given quantity.
// Returns "" when the item isn't in the dictionary.
export function predictUnit(title: string, qty: number): string {
  const unit = lookupUnit(title)
  if (!unit) return ""
  return formatUnit(unit, qty)
}