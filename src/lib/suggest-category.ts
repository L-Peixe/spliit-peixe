// shortcut: a handful of Brazilian brands on the existing categories; the
// Brazilian category list is roadmap item 2.
const KEYWORDS: [RegExp, number][] = [
  [/\b(uber|99|taxi)\b/, 35], // Taxi
  [/\b(ifood|mcdonald'?s?)\b/, 8], // Dining Out
  [/\b(mercado|supermercado|assai|carrefour)\b/, 9], // Groceries
  [/\b(netflix|spotify)\b/, 2], // Entertainment
]

/** Category id suggested by the title; 0 (General) when nothing matches. */
export function suggestCategory(title: string): number {
  const text = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return KEYWORDS.find(([pattern]) => pattern.test(text))?.[1] ?? 0
}
