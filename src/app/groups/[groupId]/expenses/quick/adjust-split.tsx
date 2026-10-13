'use client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SplitMode } from '@/generated/prisma/browser'
import { Currency } from '@/lib/currency'
import { QuickSplit, splitFooter } from '@/lib/quick-expense'
import { cn, formatCurrency } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

const MODES: SplitMode[] = ['EVENLY', 'BY_AMOUNT', 'BY_PERCENTAGE', 'BY_SHARES']

/** "Ajustar divisão": a split for this expense only (spec part B). */
export function AdjustSplit({
  participants,
  currency,
  amount,
  paidBy,
  split,
  nameOf,
  onDone,
  onBack,
}: {
  participants: { id: string; name: string }[]
  currency: Currency
  /** Parsed amount; 0 when not typed yet. */
  amount: number
  paidBy: string
  split: QuickSplit
  nameOf: (participantId: string) => string
  onDone: (paidBy: string, split: QuickSplit) => void
  onBack: () => void
}) {
  const t = useTranslations('QuickExpense.Adjust')
  const tQuick = useTranslations('QuickExpense')
  const locale = useLocale()
  const [payer, setPayer] = useState(paidBy)
  const [mode, setMode] = useState<SplitMode>(split.splitMode)
  // One entry per participant, in group order; '' or '0' means "not in it".
  const [shares, setShares] = useState(() =>
    participants.map(
      (p) =>
        split.paidFor.find((x) => x.participant === p.id)?.shares ??
        (split.splitMode === 'EVENLY' ? '0' : ''),
    ),
  )

  const { done, total, left } = splitFooter(mode, amount, shares)
  const money = (value: number) => formatCurrency(currency, value, locale, true)
  const valid =
    mode === 'EVENLY'
      ? done > 0
      : mode === 'BY_SHARES'
        ? done > 0
        : done === total && total > 0
  const footer =
    mode === 'EVENLY'
      ? t('footerEvenly', { each: money(left), count: done })
      : mode === 'BY_PERCENTAGE'
        ? t('footerPercent', { done, left })
        : mode === 'BY_AMOUNT'
          ? t('footerAmount', { done: money(done), total: money(total) })
          : t('footerShares', { count: done })

  function switchMode(next: SplitMode) {
    setMode(next)
    // Every tab starts from an even split, one tap away from valid (as in part A).
    const n = participants.length
    const even = (whole: number) => {
      const each = Math.floor((whole * 100) / n) / 100
      return participants.map((_, i) =>
        String(
          i === n - 1 ? Math.round((whole - each * (n - 1)) * 100) / 100 : each,
        ),
      )
    }
    setShares(
      next === 'BY_PERCENTAGE'
        ? even(100)
        : next === 'BY_AMOUNT'
          ? even(amount)
          : participants.map(() => '1'),
    )
  }

  function done_() {
    onDone(payer, {
      splitMode: mode,
      paidFor: participants
        .map((p, i) => ({ participant: p.id, shares: shares[i] }))
        .filter(({ shares }) => Number(shares.replace(/,/g, '.')) > 0),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={tQuick('back')}
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="flex-1 text-lg font-semibold">{t('title')}</h2>
        <Button type="button" disabled={!valid} onClick={done_}>
          {t('done')}
        </Button>
      </div>

      <Select value={payer} onValueChange={setPayer}>
        <SelectTrigger aria-label={t('paidBy', { payer: nameOf(payer) })}>
          <SelectValue>{t('paidBy', { payer: nameOf(payer) })}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {participants.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tabs value={mode} onValueChange={(v) => switchMode(v as SplitMode)}>
        <TabsList className="w-full h-auto">
          {MODES.map((m) => (
            <TabsTrigger
              key={m}
              value={m}
              className="flex-1 min-w-0 min-h-9 px-1 text-xs sm:text-sm whitespace-normal leading-tight"
            >
              {t(m)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ul className="flex flex-col gap-2">
        {mode === 'EVENLY' && (
          <li className="flex items-center gap-3 border-b pb-2">
            <Checkbox
              id="adjust-all"
              checked={shares.every((s) => s === '1')}
              onCheckedChange={(checked) =>
                setShares(participants.map(() => (checked ? '1' : '0')))
              }
            />
            <label htmlFor="adjust-all" className="text-sm font-medium">
              {t('all')}
            </label>
          </li>
        )}
        {participants.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3">
            {mode === 'EVENLY' ? (
              <>
                <Checkbox
                  id={`adjust-${p.id}`}
                  checked={shares[i] === '1'}
                  onCheckedChange={(checked) =>
                    setShares(
                      shares.map((s, j) =>
                        j === i ? (checked ? '1' : '0') : s,
                      ),
                    )
                  }
                />
                <label htmlFor={`adjust-${p.id}`} className="flex-1 text-sm">
                  {p.name}
                </label>
              </>
            ) : (
              <>
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <Input
                  className="w-24 text-base text-right"
                  inputMode="decimal"
                  aria-label={p.name}
                  value={shares[i]}
                  onChange={(e) =>
                    setShares(
                      shares.map((s, j) => (j === i ? e.target.value : s)),
                    )
                  }
                />
                <span className="w-4 text-sm text-muted-foreground">
                  {mode === 'BY_PERCENTAGE' ? '%' : ''}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <p
        className={cn(
          'text-sm text-muted-foreground border-t pt-2',
          !valid && 'text-destructive',
        )}
        data-testid="adjust-footer"
      >
        {footer}
      </p>
    </div>
  )
}
