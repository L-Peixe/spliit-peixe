import { QuickExpenseForm } from '@/app/groups/[groupId]/expenses/quick/quick-expense-form'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('QuickExpense')
  return { title: t('title') }
}

export default async function QuickExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return <QuickExpenseForm groupId={groupId} />
}
