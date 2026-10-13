'use client'
import {
  RecentGroups,
  getRecentGroups,
} from '@/app/groups/recent-groups-helpers'
import { CategorySelector } from '@/components/category-selector'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { splittingFromGroup } from '@/lib/group-defaults'
import {
  QuickSplit,
  describeSplit,
  parseAmount,
  quickExpenseValues,
  suggestCategory,
} from '@/lib/quick-expense'
import { randomId } from '@/lib/random'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ArrowLeft, Calendar, Check, NotebookPen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { AdjustSplit } from './adjust-split'
import { SplitSheet } from './split-sheet'
import { WhoAreYou } from './who-are-you'

/** Local YYYY-MM-DD, the value of an <input type="date">. */
function today() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

export function QuickExpenseForm({ groupId }: { groupId: string }) {
  const t = useTranslations('QuickExpense')
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const group = groupData?.group
  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories
  // undefined until localStorage was read, so "who are you" never flashes.
  const [activeUser, setActiveUser] = useState<string | null>()
  useEffect(() => {
    setActiveUser(localStorage.getItem(`${groupId}-activeUser`))
  }, [groupId])

  if (!group || !categories || activeUser === undefined) return null
  if (!group.participants.some((p) => p.id === activeUser))
    return (
      <WhoAreYou
        groupId={group.id}
        participants={group.participants}
        onChoose={setActiveUser}
      />
    )
  return (
    <QuickExpenseFields
      key={group.id}
      group={group}
      categories={categories}
      me={activeUser!}
      t={t}
    />
  )
}

type Group = NonNullable<AppRouterOutput['groups']['get']['group']>
type Categories = AppRouterOutput['categories']['list']['categories']

function QuickExpenseFields({
  group,
  categories,
  me,
  t,
}: {
  group: Group
  categories: Categories
  me: string
  t: ReturnType<typeof useTranslations<'QuickExpense'>>
}) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { toast } = useToast()
  const create = trpc.groups.expenses.create.useMutation()
  const currency = getCurrencyFromGroup(group)

  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [categoryChosen, setCategoryChosen] = useState(false)
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [paidBy, setPaidBy] = useState(me)
  const [split, setSplit] = useState<QuickSplit>(() =>
    splittingFromGroup(group),
  )
  const [recentGroups, setRecentGroups] = useState<RecentGroups>([])
  useEffect(() => setRecentGroups(getRecentGroups()), [])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [custom, setCustom] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Same reason as create-expense-form: a fresh id after a failed save.
  const [expenseId, setExpenseId] = useState(() => randomId())

  const nameOf = (id: string) =>
    id === me
      ? t('you')
      : (group.participants.find((p) => p.id === id)?.name ?? '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmount(amountText)
    if (!title.trim()) return setError(t('descriptionRequired'))
    if (amount === null) return setError(t('amountInvalid'))
    setError(null)
    try {
      await create.mutateAsync({
        groupId: group.id,
        participantId: me,
        expenseId,
        expenseFormValues: quickExpenseValues({
          group,
          title,
          amount,
          paidBy,
          split,
          categoryId,
          date: new Date(`${date}T12:00:00`),
          notes,
        }),
      })
    } catch {
      setExpenseId(randomId())
      toast({ variant: 'destructive', description: t('saveFailed') })
      return
    }
    utils.groups.expenses.invalidate()
    utils.groups.stats.invalidate()
    router.push(`/groups/${group.id}`)
  }

  const [, month, day] = date.split('-')

  if (adjusting)
    return (
      <AdjustSplit
        participants={group.participants}
        currency={currency}
        amount={parseAmount(amountText) ?? 0}
        paidBy={paidBy}
        split={split}
        nameOf={nameOf}
        onBack={() => setAdjusting(false)}
        onDone={(payer, newSplit) => {
          setPaidBy(payer)
          setSplit(newSplit)
          setCustom(true)
          setAdjusting(false)
        }}
      />
    )

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pb-24">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label={t('back')}>
          <Link href={`/groups/${group.id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h2 className="flex-1 text-lg font-semibold">{t('title')}</h2>
        <Button
          type="submit"
          size="icon"
          aria-label={t('save')}
          disabled={create.isPending}
        >
          <Check className="w-5 h-5" />
        </Button>
      </div>

      <p className="flex items-center gap-1 text-sm">
        {t('withYou')}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="link" className="h-auto p-0 font-semibold">
              {t('allOf', { group: group.name })}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {recentGroups
              .filter((g) => g.id !== group.id)
              .map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  onSelect={() => router.push(`/groups/${g.id}/expenses/quick`)}
                >
                  {g.name}
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem onSelect={() => router.push('/groups')}>
              {t('chooseGroup')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </p>

      <div className="flex items-center gap-2">
        <CategorySelector
          iconOnly
          categories={categories}
          defaultValue={categoryId}
          isLoading={false}
          onValueChange={(id) => {
            if (id !== categoryId) setCategoryChosen(true)
            setCategoryId(id)
          }}
        />
        <Input
          autoFocus
          name="title"
          className="text-base"
          placeholder={t('descriptionPlaceholder')}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!categoryChosen) setCategoryId(suggestCategory(e.target.value))
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-10 text-center text-muted-foreground">
          {currency.symbol}
        </span>
        <Input
          name="amount"
          inputMode="decimal"
          enterKeyHint="done"
          className="text-2xl h-12"
          placeholder="0,00"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        className="self-center rounded-full border px-4 py-2 text-sm hover:bg-accent"
        data-testid="split-button"
        onClick={() => setSheetOpen(true)}
      >
        {t.rich(
          custom
            ? 'custom'
            : split.paidFor.length === 1 &&
                split.paidFor[0].participant !== paidBy
              ? 'fullAmount'
              : 'paidBySplit',
          {
            payer: nameOf(paidBy),
            split: describeSplit(group, {
              evenly: t('splitEvenly'),
              shares: t('splitShares'),
            }),
            strong: (chunks) => <strong>{chunks}</strong>,
          },
        )}
      </button>
      <SplitSheet
        group={group}
        me={me}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onPick={(payer, newSplit) => {
          setPaidBy(payer)
          setSplit(newSplit)
          setCustom(false)
        }}
        onMore={() => setAdjusting(true)}
        onFullForm={() => router.push(`/groups/${group.id}/expenses/create`)}
      />

      {showNotes && (
        <Textarea
          name="notes"
          placeholder={t('notesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      )}

      <div className="fixed bottom-0 inset-x-0 border-t bg-background px-4 py-2 flex items-center gap-2">
        <span className="flex-1 truncate text-sm font-medium">
          {group.name}
        </span>
        <label className="relative flex items-center gap-1 text-sm cursor-pointer">
          <Calendar className="w-5 h-5" aria-label={t('date')} />
          {date !== today() && `${day}/${month}`}
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={date}
            onChange={(e) => setDate(e.target.value || today())}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('notes')}
          onClick={() => setShowNotes((v) => !v)}
        >
          <NotebookPen className="w-5 h-5" />
        </Button>
      </div>
    </form>
  )
}
