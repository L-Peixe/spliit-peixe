// Installments (ADR-011): the total is typed, the leftover cent goes on the
// first one, and the rest are born one a month by the monthly recurrence.

/** Each installment in minor units; what does not divide goes on the 1st. */
export function installmentAmounts(totalCents: number, count: number) {
  const base = Math.floor(totalCents / count)
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? totalCents - base * (count - 1) : base,
  )
}

/** "TV" → "TV (1/3)"; replaces the "(k/N)" at the end, or appends it. */
export function installmentTitle(title: string, number: number, count: number) {
  return `${title.replace(/\s*\(\d+\/\d+\)$/, '')} (${number}/${count})`
}
