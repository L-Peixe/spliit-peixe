import { SplitMode } from '@/generated/prisma/browser'

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
        shares: String(defaultShares / 100),
      })),
  }
}
