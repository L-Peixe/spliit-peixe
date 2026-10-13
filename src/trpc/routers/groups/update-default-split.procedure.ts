import { updateGroupDefaultSplit } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

// Saves only the group's default split ("Save as default" on an expense), so a
// stale expense form can never overwrite the rest of the group.
export const updateGroupDefaultSplitProcedure = baseProcedure
  .input(
    z
      .object({
        groupId: z.string().min(1),
        participantId: z.string().optional(),
        defaultSplitMode: z.enum(['EVENLY', 'BY_PERCENTAGE', 'BY_SHARES']),
        shares: z.record(z.string(), z.number().int().min(0)),
      })
      .refine(
        ({ defaultSplitMode, shares }) =>
          defaultSplitMode !== 'BY_PERCENTAGE' ||
          Object.values(shares).reduce((a, b) => a + b, 0) === 10000,
        'percentageSum',
      ),
  )
  .mutation(async ({ input: { groupId, participantId, ...defaults } }) => {
    await updateGroupDefaultSplit(groupId, defaults, participantId)
  })
