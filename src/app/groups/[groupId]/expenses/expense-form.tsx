import { CategorySelector } from '@/components/category-selector'
import { ExpenseDocumentsInput } from '@/components/expense-documents-input'
import { SplitGapFooter } from '@/components/split-gap-footer'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormField,
  FormFieldScope,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecurrenceRule, SplitMode } from '@/generated/prisma/browser'
import { Locale } from '@/i18n/request'
import { useAnalytics } from '@/lib/analytics/context'
import { Currency, getCurrency } from '@/lib/currency'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { splittingFromGroup } from '@/lib/group-defaults'
import { useActiveUser } from '@/lib/hooks'
import { formatNumberBR, numberBR } from '@/lib/number-br'
import { randomId } from '@/lib/random'
import {
  EXPENSE_NOTES_MAX,
  ExpenseFormInput,
  ExpenseFormValues,
  GroupFormValues,
  expenseFormSchema,
} from '@/lib/schemas'
import { distributeAmount } from '@/lib/shares'
import { suggestCategory } from '@/lib/suggest-category'
import { calculateShare } from '@/lib/totals'
import {
  amountAsDecimal,
  amountAsMinorUnits,
  cn,
  formatAmountAsDecimal,
  formatCurrency,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { DeletePopup } from '../../../../components/delete-popup'
import { extractCategoryFromTitle } from '../../../../components/expense-form-actions'
import { Textarea } from '../../../../components/ui/textarea'

/**
 * Keeps only what can be part of a number as typed in Brazil (ADR-010):
 * digits, dots for thousands, one decimal comma, a leading minus. Also drops
 * decimals beyond the ones the currency has: an amount is rounded to those
 * when saved, and the "amounts must add up" check compares exact values.
 */
const enforceCurrencyPattern = (value: string, currency?: Currency) => {
  const number = value.replace(/(?!^)-/g, '').replace(/[^-\d.,]/g, '')
  if (!currency) return number
  const [integer, fraction] = number.split(',')
  if (fraction === undefined || currency.decimal_digits === 0) return integer
  return `${integer},${fraction.slice(0, currency.decimal_digits)}`
}

export function ExpenseForm({
  group,
  categories,
  expense,
  expenseId,
  onSubmit,
  onDelete,
  runtimeFeatureFlags,
}: {
  group: NonNullable<AppRouterOutput['groups']['get']['group']>
  categories: AppRouterOutput['categories']['list']['categories']
  expense?: AppRouterOutput['groups']['expenses']['get']['expense']
  /**
   * The id a new expense will be created with. Only the split preview reads
   * it; when editing, `expense.id` is used instead.
   */
  expenseId?: string
  onSubmit: (value: ExpenseFormValues, participantId?: string) => Promise<void>
  onDelete?: (participantId?: string) => Promise<void>
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const t = useTranslations('ExpenseForm')
  const locale = useLocale() as Locale
  const isCreate = expense === undefined
  const searchParams = useSearchParams()

  /** Whether the form was opened from a suggested reimbursement ("Mark as paid"). */
  const isRepayment = isCreate && !!searchParams.get('reimbursement')

  const getSelectedPayer = (field?: { value: string }) => {
    if (isCreate && typeof window !== 'undefined') {
      const activeUser = localStorage.getItem(`${group.id}-activeUser`)
      if (activeUser && activeUser !== 'None' && field?.value === undefined) {
        return activeUser
      }
    }
    return field?.value
  }

  const getSelectedRecurrenceRule = (field?: { value?: string }) => {
    return field?.value as RecurrenceRule
  }
  const defaultSplittingOptions = splittingFromGroup(group)
  const groupCurrency = getCurrencyFromGroup(group)
  const form = useForm<ExpenseFormInput, any, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          title: expense.title,
          expenseDate: expense.expenseDate ?? getTodayForDateInput(),
          amount: formatNumberBR(
            amountAsDecimal(expense.amount, groupCurrency),
            groupCurrency.decimal_digits,
          ),
          originalCurrency: expense.originalCurrency ?? group.currencyCode,
          originalAmount:
            expense.originalAmount != null
              ? formatAmountAsDecimal(
                  expense.originalAmount,
                  getCurrency(
                    expense.originalCurrency ?? group.currencyCode,
                    locale,
                    'Custom',
                  ),
                )
              : undefined,
          conversionRate: expense.conversionRate?.toNumber(),
          category: expense.categoryId,
          paidBy: expense.paidById,
          paidFor: expense.paidFor.map(({ participantId, shares }) => ({
            participant: participantId,
            shares:
              expense.splitMode === 'BY_AMOUNT'
                ? formatNumberBR(
                    amountAsDecimal(shares, groupCurrency),
                    groupCurrency.decimal_digits,
                  )
                : formatNumberBR(shares / 100),
          })),
          splitMode: expense.splitMode,
          saveDefaultSplittingOptions: false,
          isReimbursement: expense.isReimbursement,
          documents: expense.documents,
          notes: expense.notes ?? '',
          recurrenceRule: expense.recurrenceRule ?? undefined,
        }
      : isRepayment
        ? {
            title: t('reimbursement'),
            expenseDate: getTodayForDateInput(),
            amount: formatNumberBR(
              amountAsDecimal(
                Number(searchParams.get('amount')) || 0,
                groupCurrency,
              ),
              groupCurrency.decimal_digits,
            ),
            originalCurrency: group.currencyCode,
            // Empty rather than undefined: the field is filled in by the conversion, and
            // switching an input from uncontrolled to controlled warns in React.
            originalAmount: '',
            conversionRate: undefined,
            category: 1, // category with Id 1 is Payment
            paidBy: searchParams.get('from') ?? undefined,
            paidFor: [
              searchParams.get('to')
                ? {
                    participant: searchParams.get('to')!,
                    shares: '1', // String for consistent form handling
                  }
                : undefined,
            ],
            isReimbursement: true,
            splitMode: defaultSplittingOptions.splitMode,
            saveDefaultSplittingOptions: false,
            documents: [],
            notes: '',
            recurrenceRule: RecurrenceRule.NONE,
          }
        : {
            title: searchParams.get('title') ?? '',
            expenseDate: searchParams.get('date')
              ? new Date(searchParams.get('date') as string)
              : getTodayForDateInput(),
            amount: searchParams.get('amount')
              ? formatNumberBR(Number(searchParams.get('amount')))
              : '',
            originalCurrency: group.currencyCode ?? undefined,
            originalAmount: undefined,
            conversionRate: undefined,
            category: searchParams.get('categoryId')
              ? Number(searchParams.get('categoryId'))
              : 0, // category with Id 0 is General
            // paid for all, split evenly
            paidFor: defaultSplittingOptions.paidFor,
            paidBy: getSelectedPayer(),
            isReimbursement: false,
            splitMode: defaultSplittingOptions.splitMode,
            saveDefaultSplittingOptions: false,
            documents: searchParams.get('imageUrl')
              ? [
                  {
                    id: randomId(),
                    url: searchParams.get('imageUrl') as string,
                    width: Number(searchParams.get('imageWidth')),
                    height: Number(searchParams.get('imageHeight')),
                  },
                ]
              : [],
            notes: '',
            recurrenceRule: RecurrenceRule.NONE,
          },
  })
  const [isCategoryLoading, setCategoryLoading] = useState(false)
  const activeUserId = useActiveUser(group.id)
  const updateDefaultSplit = trpc.groups.updateDefaultSplit.useMutation()
  const utils = trpc.useUtils()
  const watchedSplitMode = form.watch('splitMode')
  const watchedPaidFor = form.watch('paidFor')
  // A group default covers everyone and cannot be by amount.
  const canSaveDefault =
    watchedSplitMode !== 'BY_AMOUNT' &&
    group.participants.every(({ id }) =>
      watchedPaidFor.some((p) => p.participant === id),
    )
  const sendEvent = useAnalytics()

  const submit = async (values: ExpenseFormValues) => {
    sendEvent(
      { event: expense ? 'expense: update' : 'expense: create', props: {} },
      `/groups/${group.id}/expenses`,
    )

    if (values.saveDefaultSplittingOptions && canSaveDefault) {
      // Only the split: the rest of the group may have changed elsewhere.
      await updateDefaultSplit.mutateAsync({
        groupId: group.id,
        participantId: activeUserId ?? undefined,
        defaultSplitMode:
          values.splitMode as GroupFormValues['defaultSplitMode'],
        shares: Object.fromEntries(
          values.paidFor.map((p) => [p.participant, Number(p.shares)]),
        ),
      })
      await utils.groups.get.invalidate({ groupId: group.id })
    }

    // Store monetary amounts in minor units (cents)
    values.amount = amountAsMinorUnits(values.amount, groupCurrency)
    values.paidFor = values.paidFor.map(({ participant, shares }) => ({
      participant,
      shares:
        values.splitMode === 'BY_AMOUNT'
          ? amountAsMinorUnits(shares, groupCurrency)
          : shares,
    }))

    // Currency should be blank if same as group currency, or if no conversion took place
    if (conversionRequired && values.originalAmount !== undefined) {
      values.originalAmount = amountAsMinorUnits(
        values.originalAmount,
        originalCurrency,
      )
    } else {
      delete values.originalAmount
      delete values.originalCurrency
      // Without this a repayment whose converted amount rounded to zero would
      // still be saved with a rate but no amount to apply it to.
      delete values.conversionRate
    }
    return onSubmit(values, activeUserId ?? undefined)
  }

  const [isIncome, setIsIncome] = useState(
    numberBR(form.getValues().amount) < 0,
  )
  // How the user last touched each participant's share. An 'edited' amount is
  // kept as typed; every other participant takes an equal part of what is
  // left. A 'cleared' participant (the input was emptied) is one of those, but
  // the input shows its part as a placeholder rather than a value, so the user
  // can type over it without deleting it first.
  const [shareEdits, setShareEdits] = useState<
    Map<string, 'edited' | 'cleared'>
  >(new Map())

  const markShareEdited = (id: string, cleared: boolean) => {
    const state =
      cleared && form.getValues().splitMode === 'BY_AMOUNT'
        ? 'cleared'
        : 'edited'
    setShareEdits((prev) => new Map(prev).set(id, state))
  }

  const forgetShareEdit = (id: string) =>
    setShareEdits((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })

  const sExpense = isIncome ? 'Income' : 'Expense'

  // The category follows the name until it is picked by hand.
  const [categoryChosen, setCategoryChosen] = useState(
    !isCreate || isRepayment || !!searchParams.get('categoryId'),
  )
  const hasMoreOptions =
    !isCreate &&
    ((expense.recurrenceRule ?? 'NONE') !== 'NONE' ||
      !!expense.notes ||
      expense.documents.length > 0)
  const splitMode = form.watch('splitMode')
  const paidForError = form.formState.errors.paidFor
  // Shown live by SplitGapFooter instead.
  const isSumError = ['percentageSum', 'amountSum'].includes(
    paidForError?.message ?? paidForError?.root?.message ?? '',
  )

  const originalCurrency = getCurrency(
    form.getValues('originalCurrency'),
    locale,
    'Custom',
  )
  const conversionRequired =
    group.currencyCode &&
    group.currencyCode.length &&
    originalCurrency.code.length &&
    originalCurrency.code !== group.currencyCode

  useEffect(() => {
    setShareEdits(new Map())
  }, [form.watch('splitMode'), form.watch('amount')])

  useEffect(() => {
    const splitMode = form.getValues().splitMode

    // Only auto-balance for split mode 'Unevenly - By amount'
    if (
      splitMode === 'BY_AMOUNT' &&
      (form.getFieldState('paidFor').isDirty ||
        form.getFieldState('amount').isDirty)
    ) {
      const totalAmount = numberBR(form.getValues().amount) || 0
      const paidFor = form.getValues().paidFor
      let newPaidFor = [...paidFor]

      const editedParticipants = Array.from(shareEdits)
        .filter(([, state]) => state === 'edited')
        .map(([id]) => id)
      let remainingAmount = totalAmount
      let remainingParticipants = newPaidFor.length - editedParticipants.length

      newPaidFor = newPaidFor.map((participant) => {
        if (editedParticipants.includes(participant.participant)) {
          const participantShare = numberBR(participant.shares) || 0
          if (splitMode === 'BY_AMOUNT') {
            remainingAmount -= participantShare
          }
          return participant
        }
        return participant
      })

      if (remainingParticipants > 0) {
        // Apportion in minor units so the auto-filled amounts add up to the
        // total exactly. Dividing and rounding each one independently makes
        // 95 across three participants come out as 31.67 three times, which
        // the "amounts must add up" validation then rejects.
        const amountsPerRemaining = distributeAmount(
          amountAsMinorUnits(remainingAmount, groupCurrency),
          remainingParticipants,
        )

        let remainingIndex = 0
        newPaidFor = newPaidFor.map((participant) => {
          if (!editedParticipants.includes(participant.participant)) {
            return {
              ...participant,
              shares: formatNumberBR(
                amountAsDecimal(
                  amountsPerRemaining[remainingIndex++],
                  groupCurrency,
                ),
                groupCurrency.decimal_digits,
              ),
            }
          }
          return participant
        })
      }
      form.setValue('paidFor', newPaidFor, { shouldValidate: true })
    }
  }, [shareEdits, form.watch('amount'), form.watch('splitMode')])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {t(`${sExpense}.${isCreate ? 'create' : 'edit'}`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(`${sExpense}.TitleField.label`)}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(`${sExpense}.TitleField.placeholder`)}
                      className="text-base"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event)
                        if (!categoryChosen)
                          form.setValue(
                            'category',
                            suggestCategory(event.target.value),
                          )
                      }}
                      onBlur={async () => {
                        field.onBlur() // avoid skipping other blur event listeners since we overwrite `field`
                        // Skip empty titles: tabbing through the field would
                        // otherwise spend an API call to categorise "".
                        if (
                          runtimeFeatureFlags.enableCategoryExtract &&
                          !categoryChosen &&
                          field.value.trim()
                        ) {
                          setCategoryLoading(true)
                          const { categoryId } = await extractCategoryFromTitle(
                            field.value,
                          )
                          form.setValue('category', categoryId)
                          setCategoryLoading(false)
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('categoryField.label')}</FormLabel>
                  <CategorySelector
                    categories={categories}
                    defaultValue={
                      form.watch(field.name) as number // may be overwritten externally
                    }
                    onValueChange={(value) => {
                      // The selector also calls this when the value is set
                      // from outside (the suggestion); only a new value is a pick.
                      if (value !== field.value) setCategoryChosen(true)
                      field.onChange(value)
                    }}
                    isLoading={isCategoryLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>{t('amountField.label')}</FormLabel>
                  <div className="flex items-baseline gap-2">
                    <span>{group.currency}</span>
                    <FormControl>
                      <Input
                        className="text-base max-w-[160px]"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        onChange={(event) => {
                          const v = enforceCurrencyPattern(
                            event.target.value,
                            groupCurrency,
                          )
                          setIsIncome(numberBR(v) < 0)
                          onChange(v)
                        }}
                        onFocus={(e) => {
                          // we're adding a small delay to get around safaris issue with onMouseUp deselecting things again
                          const target = e.currentTarget
                          setTimeout(() => target.select(), 1)
                        }}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(`${sExpense}.paidByField.label`)}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={getSelectedPayer(field)}
                  >
                    <SelectTrigger data-testid="paid-by">
                      <SelectValue
                        placeholder={t(`${sExpense}.paidByField.placeholder`)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {group.participants.map(({ id, name }) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <FormField
                control={form.control}
                name="splitMode"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-[180px]">
                    <FormLabel>{t('SplitModeField.label')}</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          form.setValue('splitMode', value as any, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          })
                          // Validating `splitMode` leaves a "must add up"
                          // error from the previous mode in place, and its
                          // message would now be given the values of the
                          // new mode. Check the shares again for this one.
                          if (form.getFieldState('paidFor').error) {
                            form.clearErrors('paidFor')
                            void form.trigger('paidFor')
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <SelectTrigger data-testid="split-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EVENLY">
                            {t('SplitModeField.evenly')}
                          </SelectItem>
                          <SelectItem value="BY_SHARES">
                            {t('SplitModeField.byShares')}
                          </SelectItem>
                          <SelectItem value="BY_PERCENTAGE">
                            {t('SplitModeField.byPercentage')}
                          </SelectItem>
                          <SelectItem value="BY_AMOUNT">
                            {t('SplitModeField.byAmount')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              {canSaveDefault && (
                <FormField
                  control={form.control}
                  name="saveDefaultSplittingOptions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row gap-2 items-center space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel>
                          {t('SplitModeField.saveAsDefault')}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t(`${sExpense}.paidFor.title`)}
                </span>
                <Button
                  variant="link"
                  type="button"
                  className="-my-2 -mx-4"
                  onClick={() => {
                    const paidFor = form.getValues().paidFor
                    const allSelected =
                      paidFor.length === group.participants.length
                    const newPaidFor = allSelected
                      ? []
                      : group.participants.map((p) => ({
                          participant: p.id,
                          shares:
                            paidFor.find((pfor) => pfor.participant === p.id)
                              ?.shares ?? '1', // Use string to ensure consistent schema handling
                        }))
                    form.setValue('paidFor', newPaidFor, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                    if (allSelected) setShareEdits(new Map())
                  }}
                >
                  {form.getValues().paidFor.length ===
                  group.participants.length ? (
                    <>{t('selectNone')}</>
                  ) : (
                    <>{t('selectAll')}</>
                  )}
                </Button>
              </div>
              <FormField
                control={form.control}
                name="paidFor"
                render={() => (
                  <FormItem className="sm:order-4 row-span-2 space-y-0">
                    {group.participants.map(({ id, name }) => (
                      <FormField
                        key={id}
                        control={form.control}
                        name="paidFor"
                        render={({ field }) => {
                          const index = field.value.findIndex(
                            ({ participant }) => participant === id,
                          )
                          const isSelected = index !== -1
                          const row = field.value[index]
                          const cleared = shareEdits.get(id) === 'cleared'
                          const sharesLabel = (
                            <span
                              className={cn('text-sm', {
                                'text-muted': !isSelected,
                              })}
                            >
                              {match(form.getValues().splitMode)
                                .with('BY_SHARES', () => <>{t('shares')}</>)
                                .with('BY_PERCENTAGE', () => <>%</>)
                                .with('BY_AMOUNT', () => <>{group.currency}</>)
                                .otherwise(() => (
                                  <></>
                                ))}
                            </span>
                          )
                          return (
                            <div
                              data-id={`${id}/${form.getValues().splitMode}/${
                                group.currency
                              }`}
                              className="flex flex-wrap gap-y-4 items-center border-t last-of-type:border-b last-of-type:!mb-4 -mx-6 px-6 py-3"
                            >
                              <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const options = {
                                        shouldDirty: true,
                                        shouldTouch: true,
                                        shouldValidate: true,
                                      }
                                      checked
                                        ? form.setValue(
                                            'paidFor',
                                            [
                                              ...field.value,
                                              {
                                                participant: id,
                                                shares: '1', // Use string to ensure consistent schema handling
                                              },
                                            ],
                                            options,
                                          )
                                        : form.setValue(
                                            'paidFor',
                                            field.value?.filter(
                                              (value) =>
                                                value.participant !== id,
                                            ),
                                            options,
                                          )
                                      if (!checked) forgetShareEdit(id)
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal flex-1">
                                  {name}
                                  {isSelected &&
                                    !form.watch('isReimbursement') && (
                                      <span className="text-muted-foreground ml-2">
                                        (
                                        {formatCurrency(
                                          groupCurrency,
                                          calculateShare(id, {
                                            // The id seeds who takes the
                                            // leftover minor unit of an uneven
                                            // split, so passing the one the
                                            // expense has (or will be created
                                            // with) makes the amounts here match
                                            // the balances tab once saved.
                                            id: expense?.id ?? expenseId,
                                            amount: amountAsMinorUnits(
                                              numberBR(form.watch('amount')),
                                              groupCurrency,
                                            ), // Convert to cents
                                            paidFor: field.value.map(
                                              ({ participant, shares }) => ({
                                                participant: {
                                                  id: participant,
                                                  name: '',
                                                  groupId: '',
                                                },
                                                shares:
                                                  form.watch('splitMode') ===
                                                  'BY_PERCENTAGE'
                                                    ? numberBR(shares) * 100 // Convert percentage to basis points (e.g., 50% -> 5000)
                                                    : form.watch(
                                                          'splitMode',
                                                        ) === 'BY_AMOUNT'
                                                      ? amountAsMinorUnits(
                                                          numberBR(shares),
                                                          groupCurrency,
                                                        )
                                                      : numberBR(shares),
                                                expenseId: '',
                                                participantId: '',
                                              }),
                                            ),
                                            splitMode: form.watch(
                                              'splitMode',
                                            ) as SplitMode,
                                            isReimbursement:
                                              form.watch('isReimbursement'),
                                          }),
                                          locale,
                                        )}
                                        )
                                      </span>
                                    )}
                                </FormLabel>
                              </FormItem>
                              <div className="flex flex-wrap justify-end gap-y-2">
                                {form.getValues().splitMode !== 'EVENLY' && (
                                  <FormFieldScope
                                    name={`paidFor.${index}.shares`}
                                  >
                                    <div>
                                      <div className="flex gap-1 items-center">
                                        {form.getValues().splitMode ===
                                          'BY_AMOUNT' && sharesLabel}
                                        <FormControl>
                                          <Input
                                            key={String(!isSelected)}
                                            className="text-base w-[80px] -my-2"
                                            type="text"
                                            disabled={!isSelected}
                                            value={cleared ? '' : row?.shares}
                                            placeholder={
                                              cleared
                                                ? String(row?.shares ?? '')
                                                : undefined
                                            }
                                            onChange={(event) => {
                                              const shares =
                                                enforceCurrencyPattern(
                                                  event.target.value,
                                                  form.getValues().splitMode ===
                                                    'BY_AMOUNT'
                                                    ? groupCurrency
                                                    : undefined,
                                                )
                                              field.onChange(
                                                field.value.map((p) =>
                                                  p.participant === id
                                                    ? {
                                                        participant: id,
                                                        shares,
                                                      }
                                                    : p,
                                                ),
                                              )
                                              markShareEdited(id, shares === '')
                                            }}
                                            inputMode={
                                              form.getValues().splitMode ===
                                              'BY_AMOUNT'
                                                ? 'decimal'
                                                : 'numeric'
                                            }
                                            step={
                                              form.getValues().splitMode ===
                                              'BY_AMOUNT'
                                                ? 10 **
                                                  -groupCurrency.decimal_digits
                                                : 1
                                            }
                                          />
                                        </FormControl>
                                        {[
                                          'BY_SHARES',
                                          'BY_PERCENTAGE',
                                        ].includes(
                                          form.getValues().splitMode!,
                                        ) && sharesLabel}
                                      </div>
                                      <FormMessage className="float-right" />
                                    </div>
                                  </FormFieldScope>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      />
                    ))}
                    {splitMode === 'BY_PERCENTAGE' ||
                    splitMode === 'BY_AMOUNT' ? (
                      <SplitGapFooter
                        mode={splitMode}
                        total={
                          splitMode === 'BY_PERCENTAGE'
                            ? 100
                            : numberBR(form.watch('amount')) || 0
                        }
                        values={watchedPaidFor.map((p) => p.shares)}
                        currency={groupCurrency}
                      />
                    ) : null}
                    {!isSumError && <FormMessage />}
                  </FormItem>
                )}
              />
            </div>

            <Collapsible defaultOpen={hasMoreOptions}>
              <CollapsibleTrigger asChild>
                <Button variant="link" type="button" className="-mx-4">
                  {t('moreOptions')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(`${sExpense}.DateField.label`)}</FormLabel>
                      <FormControl>
                        <Input
                          className="date-base"
                          type="date"
                          defaultValue={formatDate(field.value as Date)}
                          onChange={(event) => {
                            return field.onChange(new Date(event.target.value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recurrenceRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t(`${sExpense}.recurrenceRule.label`)}
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          form.setValue(
                            'recurrenceRule',
                            value as RecurrenceRule,
                          )
                        }}
                        defaultValue={getSelectedRecurrenceRule(field)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="NONE" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">
                            {t(`${sExpense}.recurrenceRule.none`)}
                          </SelectItem>
                          <SelectItem value="DAILY">
                            {t(`${sExpense}.recurrenceRule.daily`)}
                          </SelectItem>
                          <SelectItem value="WEEKLY">
                            {t(`${sExpense}.recurrenceRule.weekly`)}
                          </SelectItem>
                          <SelectItem value="MONTHLY">
                            {t(`${sExpense}.recurrenceRule.monthly`)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notesField.label')}</FormLabel>
                      <FormControl>
                        <Textarea
                          className="text-base"
                          maxLength={EXPENSE_NOTES_MAX}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {runtimeFeatureFlags.enableExpenseDocuments && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">
                      {t('attachDocuments')}
                    </span>
                    <FormField
                      control={form.control}
                      name="documents"
                      render={({ field }) => (
                        <ExpenseDocumentsInput
                          documents={field.value ?? []}
                          updateDocuments={field.onChange}
                          onDocumentAttached={() =>
                            sendEvent(
                              { event: 'expense: attach document', props: {} },
                              `/groups/${group.id}/expenses`,
                            )
                          }
                        />
                      )}
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row mt-4 gap-2">
          <SubmitButton
            className="w-full sm:w-auto"
            loadingContent={t(isCreate ? 'creating' : 'saving')}
          >
            <Save className="w-4 h-4 mr-2" />
            {t(isCreate ? 'create' : 'save')}
          </SubmitButton>
          {!isCreate && onDelete && (
            <DeletePopup
              onDelete={async () => {
                sendEvent(
                  { event: 'expense: delete', props: {} },
                  `/groups/${group.id}/expenses`,
                )
                await onDelete(activeUserId ?? undefined)
              }}
            ></DeletePopup>
          )}
          <Button variant="ghost" className="w-full sm:w-auto" asChild>
            <Link href={`/groups/${group.id}`}>{t('cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}

function formatDate(date?: Date) {
  if (!date || isNaN(date as any)) date = getTodayForDateInput()
  return date.toISOString().substring(0, 10)
}

function getTodayForDateInput() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}
