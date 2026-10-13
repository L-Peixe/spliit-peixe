'use client'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { splittingFromGroup } from '@/lib/group-defaults'
import { QuickSplit, describeSplit, fullAmountTo } from '@/lib/quick-expense'
import { useTranslations } from 'next-intl'

type Group = Parameters<typeof describeSplit>[0] & {
  participants: { id: string; name: string; defaultShares: number }[]
}

/** "Who paid" shortcuts (spec part B, "O botão da divisão"). */
export function SplitSheet({
  group,
  me,
  open,
  onOpenChange,
  onPick,
  onMore,
  onFullForm,
}: {
  group: Group
  me: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (paidBy: string, split: QuickSplit) => void
  onMore: () => void
  onFullForm: () => void
}) {
  const t = useTranslations('QuickExpense')
  const defaultSplit = splittingFromGroup(group)
  const split = describeSplit(group, {
    evenly: t('splitEvenly'),
    shares: t('splitShares'),
  })
  const nameOf = (id: string) =>
    id === me ? t('youCap') : group.participants.find((p) => p.id === id)!.name
  // Me first, then everyone else in group order.
  const people = [
    me,
    ...group.participants.map((p) => p.id).filter((id) => id !== me),
  ]

  const options: { label: string; pick: () => void }[] =
    people.length === 2
      ? people.flatMap((payer, i) => {
          const other = people[1 - i]
          return [
            {
              label: t('paidShortcut', { payer: nameOf(payer), split }),
              pick: () => onPick(payer, defaultSplit),
            },
            {
              label: t('fullAmountShortcut', { payer: nameOf(payer) }),
              pick: () => onPick(payer, fullAmountTo(other)),
            },
          ]
        })
      : people.map((payer) => ({
          label: t('paidShortcut', { payer: nameOf(payer), split }),
          pick: () => onPick(payer, defaultSplit),
        }))

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('sheetTitle')}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col pb-6">
          {[
            ...options,
            { label: t('more'), pick: onMore },
            { label: t('fullForm'), pick: onFullForm },
          ].map(({ label, pick }) => (
            <button
              key={label}
              type="button"
              className="px-6 py-4 text-left text-base border-t hover:bg-accent"
              onClick={() => {
                pick()
                onOpenChange(false)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
