'use client'
import { Currency } from '@/lib/currency'
import { formatNumberBR } from '@/lib/number-br'
import { splitGap } from '@/lib/split-gap'
import { formatCurrency } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'

/** Red "exceeded by" / "missing" line under a split that does not add up. */
export function SplitGapFooter({
  mode,
  total,
  values,
  currency,
}: {
  mode: 'BY_PERCENTAGE' | 'BY_AMOUNT'
  /** 100 for a percentage; the expense amount in major units otherwise. */
  total: number
  values: unknown[]
  currency?: Currency
}) {
  const t = useTranslations('SplitGap')
  const locale = useLocale()
  const { direction, difference } = splitGap(total, values)
  if (!direction) return null
  const percent = mode === 'BY_PERCENTAGE'
  return (
    <p className="text-sm text-destructive" data-testid="split-gap">
      {t(
        `${percent ? 'percent' : 'amount'}${direction === 'over' ? 'Over' : 'Under'}`,
        {
          difference:
            percent || !currency
              ? formatNumberBR(difference)
              : formatCurrency(currency, difference, locale, true),
        },
      )}
    </p>
  )
}
