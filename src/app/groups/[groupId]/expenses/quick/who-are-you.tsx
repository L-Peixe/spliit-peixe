'use client'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

/** Asked once per device and group before the first quick expense. */
export function WhoAreYou({
  groupId,
  participants,
  onChoose,
}: {
  groupId: string
  participants: { id: string; name: string }[]
  onChoose: (participantId: string) => void
}) {
  const t = useTranslations('QuickExpense.WhoAreYou')
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <div className="flex flex-col gap-2">
        {participants.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            className="justify-start h-12 text-base"
            onClick={() => {
              localStorage.setItem(`${groupId}-activeUser`, p.id)
              onChoose(p.id)
            }}
          >
            {p.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
