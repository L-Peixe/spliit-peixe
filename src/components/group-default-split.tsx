'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { percentTotal } from '@/lib/group-defaults'
import { GroupFormInput, GroupFormValues } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { UseFormReturn, useWatch } from 'react-hook-form'

type Mode = GroupFormValues['defaultSplitMode']
const MODES: Mode[] = ['EVENLY', 'BY_PERCENTAGE', 'BY_SHARES']

function asNumber(value: unknown) {
  const number = Number(String(value ?? '').replace(/,/g, '.'))
  return Number.isNaN(number) ? 0 : number
}

/** "Como vocês costumam dividir?" — the group's default split (spec part A). */
export function GroupDefaultSplit({
  form,
}: {
  form: UseFormReturn<GroupFormInput, any, GroupFormValues>
}) {
  const t = useTranslations('GroupForm.DefaultSplit')
  const mode = (useWatch({ control: form.control, name: 'defaultSplitMode' }) ??
    'EVENLY') as Mode
  const participants =
    useWatch({ control: form.control, name: 'participants' }) ?? []

  const values = participants.map((p) => asNumber(p.defaultShares))
  const sum = percentTotal(participants.map((p) => p.defaultShares))
  const percentOff = mode === 'BY_PERCENTAGE' && sum !== 100
  const zeroShares =
    (mode === 'BY_SHARES' && values.some((v) => v <= 0)) ||
    (mode === 'BY_PERCENTAGE' && values.some((v) => v < 0))

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs
          value={mode}
          onValueChange={(value) => {
            form.setValue('defaultSplitMode', value as Mode, {
              shouldDirty: true,
            })
            // Start from an even split, so switching is one tap away from valid.
            const count = participants.length
            const even = Math.floor(10000 / count) / 100
            participants.forEach((_, index) =>
              form.setValue(
                `participants.${index}.defaultShares`,
                value === 'BY_PERCENTAGE'
                  ? String(
                      index === count - 1
                        ? Math.round((100 - even * (count - 1)) * 100) / 100
                        : even,
                    )
                  : '1',
              ),
            )
          }}
        >
          <TabsList className="w-full h-auto">
            {MODES.map((m) => (
              <TabsTrigger
                key={m}
                value={m}
                className="flex-1 min-w-0 min-h-9 px-1 whitespace-normal leading-tight"
              >
                {t(m)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {mode !== 'EVENLY' && (
          <>
            <ul className="flex flex-col gap-2">
              {participants.map((participant, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm">
                    {participant.name}
                  </span>
                  <FormField
                    control={form.control}
                    name={`participants.${index}.defaultShares`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-1 space-y-0">
                        <FormControl>
                          <Input
                            className="w-20 text-base text-right"
                            inputMode="decimal"
                            aria-label={t('shareOf', {
                              name: participant.name,
                            })}
                            {...field}
                            value={String(field.value ?? '')}
                          />
                        </FormControl>
                        <span className="w-4 text-sm text-muted-foreground">
                          {mode === 'BY_PERCENTAGE' ? '%' : ''}
                        </span>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ul>
            <p
              className={cn(
                'text-sm text-muted-foreground border-t pt-2',
                (percentOff || zeroShares) && 'text-destructive',
              )}
            >
              {mode === 'BY_PERCENTAGE'
                ? t('percentFooter', {
                    sum,
                    left: Math.round((100 - sum) * 100) / 100,
                  })
                : zeroShares
                  ? t('zeroShares')
                  : t('sharesFooter', { count: sum })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
