import { Page } from '@playwright/test'
import {
  createGroup,
  expectBalance,
  EXPENSES_URL,
  openExpense,
  openTab,
  paidForRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable, selectRadixOption, setChecked } from './ui'

// docs/specs/2026-10-13-tela-unica-e-parcelado.md §1–4, on a phone.
// No seeded "None": the active user comes from creating the group, as in real use.
test.use({ viewport: { width: 360, height: 760 }, seedActiveUser: false })

async function newGroup(page: Page) {
  // Creating the group answers "Who are you in this group?" with Ana.
  return createGroup(page, {
    name: `E2E Single ${uniqueSuffix()}`,
    participants: ['Ana', 'Beto'],
  })
}

async function openForm(page: Page, groupId: string) {
  await page.goto(`/groups/${groupId}/expenses`)
  await page.getByRole('link', { name: 'Add expense' }).click()
  await page.waitForURL(`**/groups/${groupId}/expenses/create`)
  await expect(page.getByTestId('paid-by')).toContainText('Ana', {
    timeout: 30_000,
  })
}

async function fill(page: Page, title: string, amount: string) {
  await fillStable(page.locator('input[name="title"]'), title)
  await fillStable(page.locator('input[name="amount"]'), amount)
}

const create = (page: Page) =>
  page.getByRole('button', { name: 'Create', exact: true }).click()

test('name and amount are enough; paid by you, split as the group does', async ({
  page,
}) => {
  const groupId = await newGroup(page)
  await openForm(page, groupId)
  // Before an amount is typed, each share reads as zero, not NaN.
  await expect(paidForRow(page, 'Ana')).toContainText('0.00')
  await expect(page.getByText(/NaN/)).toHaveCount(0)
  await fill(page, 'Mercado', '100')
  await create(page)
  await page.waitForURL(EXPENSES_URL)

  await openTab(page, 'Balances')
  await expectBalance(page, 'Ana', 50)
  await expectBalance(page, 'Beto', -50)
})

test('another payer, and someone left out of the expense', async ({ page }) => {
  const groupId = await newGroup(page)
  await openForm(page, groupId)
  await expect(
    page.getByText('Who is part of this expense?', { exact: true }),
  ).toBeVisible()
  await fill(page, 'Táxi', '1.000')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Beto')
  await setChecked(paidForRow(page, 'Beto').getByRole('checkbox'), false)
  await create(page)
  await page.waitForURL(EXPENSES_URL)

  // Beto paid R$ 1.000 (a thousand: the dot groups thousands) for Ana only.
  await openTab(page, 'Balances')
  await expectBalance(page, 'Beto', 1000)
  await expectBalance(page, 'Ana', -1000)
})

test('12.50 asks for a comma instead of becoming another number', async ({
  page,
}) => {
  const groupId = await newGroup(page)
  await openForm(page, groupId)
  await fill(page, 'Café', '12.50')
  await create(page)
  await expect(page.getByText('Use a comma for the cents.')).toBeVisible()
  await expect(page).toHaveURL(/\/expenses\/create/)
})

test('a split above 100% is not saved', async ({ page }) => {
  const groupId = await newGroup(page)
  await openForm(page, groupId)
  await fill(page, 'Aluguel', '100')
  await selectRadixOption(page, page.getByTestId('split-mode'), /By percentage/)
  await fillStable(paidForRow(page, 'Ana').getByRole('textbox'), '60')
  await fillStable(paidForRow(page, 'Beto').getByRole('textbox'), '50')
  await expect(page.getByText('Percentage exceeded by 10%')).toBeVisible()
  await create(page)
  await expect(page).toHaveURL(/\/expenses\/create/)

  await fillStable(paidForRow(page, 'Beto').getByRole('textbox'), '39,5')
  await expect(page.getByText('0,5% missing')).toBeVisible()
})

test('the name suggests the category until one is picked', async ({ page }) => {
  const groupId = await newGroup(page)
  await openForm(page, groupId)
  await fillStable(page.locator('input[name="title"]'), 'Uber')
  await expect(page.getByRole('combobox').first()).toContainText('Taxi')
})

test('editing keeps the comma and saves untouched', async ({ page }) => {
  const groupId = await newGroup(page)
  await openForm(page, groupId)
  await fill(page, 'Padaria', '12,50')
  await create(page)
  await page.waitForURL(EXPENSES_URL)

  await openExpense(page, 'Padaria')
  await expect(page.locator('input[name="amount"]')).toHaveValue('12,50')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(EXPENSES_URL)
  await openTab(page, 'Balances')
  await expectBalance(page, 'Ana', 6.25)
})

test('the groups list opens the last group, or group creation', async ({
  page,
  browser,
}) => {
  // A fresh device knows no group yet.
  const fresh = await browser.newPage()
  await fresh.goto('/groups')
  await fresh.getByRole('link', { name: 'Add expense' }).click()
  await fresh.waitForURL('**/groups/create')
  await fresh.close()

  const groupId = await newGroup(page)
  await page.goto('/groups')
  await page.getByRole('link', { name: 'Add expense' }).click()
  await page.waitForURL(`**/groups/${groupId}/expenses/create`)
})
