export const YIELD_UNIT_OPTIONS = [
  { value: "lbs", label: "lbs", abbr: "lbs" },
  { value: "bushel", label: "Bushel", abbr: "bu" },
  { value: "box", label: "Box", abbr: "bx" },
  { value: "sack", label: "Sack", abbr: "sk" },
  { value: "crate", label: "Crate", abbr: "cr" },
  { value: "bin", label: "Bin", abbr: "bn" },
  { value: "pallet", label: "Pallet", abbr: "plt" },
  { value: "custom", label: "Custom", abbr: "" },
] as const;
export type YieldUnit = typeof YIELD_UNIT_OPTIONS[number]["value"];