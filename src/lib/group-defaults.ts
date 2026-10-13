import { SplitMode } from '@/generated/prisma/browser'
import { formatNumberBR, numberBR } from '@/lib/number-br'

// The group's default split (part A of docs/specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md).
// Shares use the ExpensePaidFor unit: 25% = 2500, 1 part = 100.

type GroupWithDefaults = {
  defaultSplitMode: SplitMode
  participants: { id: string; name: string; defaultShares: number }[]
}

/** Default split options of a new expense, as the expense form expects them. */
export function splittingFromGroup(group: GroupWithDefaults): {
  splitMode: SplitMode
  paidFor: { participant: string; shares: string }[]
} {
  if (group.defaultSplitMode === 'EVENLY') {
    return {
      splitMode: 'EVENLY',
      paidFor: group.participants.map(({ id }) => ({
        participant: id,
        shares: '1',
      })),
    }
  }
  return {
    splitMode: group.defaultSplitMode,
    // Someone at 0% is not part of the split; the expense schema rejects 0.
    paidFor: group.participants
      .filter(({ defaultShares }) => defaultShares > 0)
      .map(({ id, defaultShares }) => ({
        participant: id,
        shares: formatNumberBR(defaultShares / 100),
      })),
  }
}

type GroupSnapshot = {
  name: string
  currencyCode?: string | null
  defaultSplitMode: SplitMode
  participants: { id?: string; name: string; defaultShares: number }[]
}

function describeSplit({ defaultSplitMode, participants }: GroupSnapshot) {
  if (defaultSplitMode === 'EVENLY') return 'igualmente'
  const values = participants.map((p) => p.defaultShares / 100)
  return defaultSplitMode === 'BY_PERCENTAGE'
    ? values.map((v) => `${v}%`).join(' / ')
    : `partes ${values.join(' / ')}`
}

/**
 * One readable pt-BR line with what a group edit changed, kept in the
 * activity log; undefined when nothing it tracks changed.
 */
export function describeGroupChanges(
  before: GroupSnapshot,
  after: GroupSnapshot,
): string | undefined {
  const changes: string[] = []
  if (before.name !== after.name)
    changes.push(`nome: ${before.name} → ${after.name}`)
  if ((before.currencyCode ?? '') !== (after.currencyCode ?? ''))
    changes.push(`moeda: ${before.currencyCode} → ${after.currencyCode}`)

  const joined = after.participants.filter((p) => p.id === undefined)
  const left = before.participants.filter(
    (p) => !after.participants.some((q) => q.id === p.id),
  )
  if (joined.length)
    changes.push(`entrou: ${joined.map((p) => p.name).join(', ')}`)
  if (left.length) changes.push(`saiu: ${left.map((p) => p.name).join(', ')}`)

  const [splitBefore, splitAfter] = [
    describeSplit(before),
    describeSplit(after),
  ]
  if (splitBefore !== splitAfter)
    changes.push(`divisão: ${splitBefore} → ${splitAfter}`)

  return changes.length ? changes.join('; ') : undefined
}

/** Live percentage total of the group form, rounded per value like the schema. */
export function percentTotal(values: unknown[]): number {
  const cents = values.reduce<number>((sum, value) => {
    const number = numberBR(value)
    return sum + (Number.isNaN(number) ? 0 : Math.round(number * 100))
  }, 0)
  return cents / 100
}
