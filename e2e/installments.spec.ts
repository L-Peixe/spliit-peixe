import {
  createGroup,
  daysAgo,
  expenseCard,
  EXPENSES_URL,
  openMoreOptions,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable, money, selectRadixOption } from './ui'

// docs/specs/2026-10-13-tela-unica-e-parcelado.md §5, on a phone.
test.use({ viewport: { width: 360, height: 760 }, seedActiveUser: false })

async function newExpense(page: import('@playwright/test').Page) {
  const groupId = await createGroup(page, {
    name: `E2E Installments ${uniqueSuffix()}`,
    participants: ['Ana', 'Beto'],
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(page.getByTestId('paid-by')).toContainText('Ana', {
    timeout: 30_000,
  })
  await fillStable(page.locator('input[name="title"]'), 'Geladeira')
  await fillStable(page.locator('input[name="amount"]'), '100')
  await openMoreOptions(page)
  await page.getByRole('checkbox', { name: 'In installments' }).click()
  await selectRadixOption(
    page,
    page.getByRole('combobox', { name: 'Number of installments' }),
    '3x',
  )
  return groupId
}

test('one a month from the date, the extra cent on the first', async ({
  page,
}) => {
  await newExpense(page)
  await expect(page.getByText(`3x of ${money(33.33)}`)).toBeVisible()
  // About two months back: the 2nd and 3rd are already due.
  await fillStable(page.locator('input[type="date"]'), daysAgo(70))
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForURL(EXPENSES_URL, { timeout: 30_000 })

  await page.reload()
  await expect(expenseCard(page, 'Geladeira (1/3)')).toContainText(money(33.34))
  await expect(expenseCard(page, 'Geladeira (2/3)')).toContainText(money(33.33))
  await expect(expenseCard(page, 'Geladeira (3/3)')).toContainText(money(33.33))
  await expect(page.getByTestId('expense-card')).toHaveCount(3)
})

test('not with a split by amount', async ({ page }) => {
  await newExpense(page)
  await selectRadixOption(page, page.getByTestId('split-mode'), /By amount/)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(
    page.getByText(/Installments do not combine with a split by amount/),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/expenses\/create/)
})
