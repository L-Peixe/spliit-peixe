import { SplitMode } from '@/generated/prisma/browser'
import { splittingFromGroup } from '@/lib/group-defaults'
import { ExpenseFormValues } from '@/lib/schemas'
import { amountAsMinorUnits, getCurrencyFromGroup } from '@/lib/utils'

// The one-screen expense (part B of docs/specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md).

type QuickGroup = Parameters<typeof splittingFromGroup>[0] & {
  currency: string
  currencyCode: string | null
}

export type QuickSplit = ReturnType<typeof splittingFromGroup>

function toNumber(text: string) {
  const trimmed = text.trim()
  return trimmed === '' ? NaN : Number(trimmed.replace(/,/g, '.'))
}

/** '12,50' → 12.5; nothing usable as an expense amount → null. */
export function parseAmount(text: string): number | null {
  const number = toNumber(text)
  return Number.isFinite(number) && number > 0 ? number : null
}

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

/** The group default as the split button writes it; words come translated. */
export function describeSplit(
  group: QuickGroup,
  words: { evenly: string; shares: string },
): string {
  if (group.defaultSplitMode === 'BY_PERCENTAGE')
    return group.participants.map((p) => p.defaultShares / 100).join('/')
  if (group.defaultSplitMode === 'BY_SHARES') return words.shares
  return words.evenly
}

/** "X tem o valor total a receber": only this participant owes. */
export function fullAmountTo(participantId: string): QuickSplit {
  return {
    splitMode: 'EVENLY',
    paidFor: [{ participant: participantId, shares: '1' }],
  }
}

/** Values for groups.expenses.create, in the units the full form sends. */
export function quickExpenseValues(input: {
  group: QuickGroup
  title: string
  amount: number
  paidBy: string
  split: QuickSplit
  categoryId: number
  date: Date
  notes?: string
}): ExpenseFormValues {
  const currency = getCurrencyFromGroup(input.group)
  const { splitMode } = input.split
  return {
    expenseDate: input.date,
    title: input.title.trim(),
    category: input.categoryId,
    amount: amountAsMinorUnits(input.amount, currency),
    paidBy: input.paidBy,
    paidFor: input.split.paidFor.map(({ participant, shares }) => ({
      participant,
      shares:
        splitMode === 'BY_AMOUNT'
          ? amountAsMinorUnits(toNumber(shares), currency)
          : Math.round(toNumber(shares) * 100),
    })),
    splitMode,
    saveDefaultSplittingOptions: false,
    isReimbursement: false,
    documents: [],
    notes: input.notes || undefined,
    recurrenceRule: 'NONE',
  }
}

/** Live footer of "Ajustar divisão". EVENLY: people ticked, of all, and the amount each. */
export function splitFooter(
  mode: SplitMode,
  amount: number,
  shares: string[],
): { done: number; total: number; left: number } {
  const round = (n: number) => Math.round(n * 100) / 100
  const values = shares.map((s) => toNumber(s) || 0)
  const done = round(values.reduce((a, b) => a + b, 0))
  if (mode === 'EVENLY') {
    const ticked = values.filter((v) => v > 0).length
    return {
      done: ticked,
      total: shares.length,
      left: ticked ? round(amount / ticked) : 0,
    }
  }
  const total =
    mode === 'BY_PERCENTAGE' ? 100 : mode === 'BY_AMOUNT' ? amount : done
  return { done, total, left: round(total - done) }
}
