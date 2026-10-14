'use client'
import { getRecentGroups } from '@/app/groups/recent-groups-helpers'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Big floating "Adicionar despesa". Without a groupId it opens the last group
 * used on this device, or group creation when there is none.
 */
export function AddExpenseFab({ groupId }: { groupId?: string }) {
  const t = useTranslations('QuickExpense')
  const [target, setTarget] = useState(groupId)
  useEffect(() => {
    if (!groupId) setTarget(getRecentGroups()[0]?.id ?? '')
  }, [groupId])

  if (target === undefined) return null
  return (
    <Link
      href={target ? `/groups/${target}/expenses/create` : '/groups/create'}
      className="fixed bottom-4 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg hover:bg-primary/90"
    >
      <Plus className="h-6 w-6" />
      <span className="font-semibold">{t('fab')}</span>
    </Link>
  )
}
