import { Page } from '@playwright/test'
import {
  createGroup,
  expectBalance,
  openExpense,
  openTab,
  paidForRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable } from './ui'

// Part B of docs/specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md, on a phone.
test.use({ viewport: { width: 360, height: 760 } })

const EXPENSES_OR_GROUP = /\/groups\/[^/]+(\/expenses)?(\?|$)/

async function newGroup(page: Page, name = `E2E Quick ${uniqueSuffix()}`) {
  const groupId = await createGroup(page, {
    name,
    participants: ['Ana', 'Beto'],
  })
  return { groupId, name }
}

/** Opens the quick screen from the group's floating button, as Ana. */
async function openQuick(page: Page, groupId: string) {
  await page.goto(`/groups/${groupId}/expenses`)
  await page.getByRole('link', { name: 'Add expense' }).click()
  await page.waitForURL(`**/groups/${groupId}/expenses/quick`)
  // The suite seeds "None" as the active user, so the screen asks first.
  await expect(page.getByText('Who are you?')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Ana', exact: true }).click()
}

async function fillAndSave(page: Page, title: string, amount: string) {
  await fillStable(page.locator('input[name="title"]'), title)
  await fillStable(page.locator('input[name="amount"]'), amount)
  await page.locator('input[name="amount"]').press('Enter')
  await page.waitForURL(EXPENSES_OR_GROUP, { timeout: 30_000 })
}

test('description and amount are enough; the group default applies', async ({
  page,
}) => {
  const { groupId } = await newGroup(page)
  await openTab(page, 'Settings')
  await page.getByRole('tab', { name: 'By percentage', exact: true }).click()
  await fillStable(page.getByRole('textbox', { name: 'Share of Ana' }), '25')
  await fillStable(page.getByRole('textbox', { name: 'Share of Beto' }), '75')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect
    .poll(async () => {
      await page.goto(`/groups/${groupId}/edit`)
      return page
        .getByRole('tab', { name: 'By percentage', exact: true })
        .getAttribute('aria-selected')
    })
    .toBe('true')

  await openQuick(page, groupId)
  await expect(page.getByTestId('split-button')).toContainText('25/75')
  await fillAndSave(page, 'Mercado', '100')

  await openExpense(page, 'Mercado')
  await expect(paidForRow(page, 'Ana').getByRole('textbox')).toHaveValue('25')
  await expect(paidForRow(page, 'Beto').getByRole('textbox')).toHaveValue('75')
  await expect(
    page.getByRole('combobox').filter({ hasText: 'Groceries' }),
  ).toBeVisible()
})

test('the other person paid, split evenly', async ({ page }) => {
  const { groupId } = await newGroup(page)
  await openQuick(page, groupId)
  await page.getByTestId('split-button').click()
  await page.getByRole('button', { name: 'Beto paid, split evenly' }).click()
  await expect(page.getByTestId('split-button')).toContainText('Paid by Beto')
  await fillAndSave(page, 'Pizza', '100')
  await page.goto(`/groups/${groupId}/balances`)
  await expectBalance(page, 'Beto', 50)
})

test('you are owed the full amount', async ({ page }) => {
  const { groupId } = await newGroup(page)
  await openQuick(page, groupId)
  await page.getByTestId('split-button').click()
  await page
    .getByRole('button', { name: 'You are owed the full amount' })
    .click()
  await fillAndSave(page, 'Empréstimo', '80')
  await page.goto(`/groups/${groupId}/balances`)
  await expectBalance(page, 'Beto', -80)
})

test('adjust the split for one expense', async ({ page }) => {
  const { groupId } = await newGroup(page)
  await openQuick(page, groupId)
  await fillStable(page.locator('input[name="title"]'), 'Jantar')
  await fillStable(page.locator('input[name="amount"]'), '50')
  await page.getByTestId('split-button').click()
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('tab', { name: 'Percentage' }).click()
  await fillStable(page.getByRole('textbox', { name: 'Ana' }), '90')
  await fillStable(page.getByRole('textbox', { name: 'Beto' }), '0')
  await expect(page.getByTestId('adjust-footer')).toContainText('10% left')
  await expect(page.getByRole('button', { name: 'Done' })).toBeDisabled()

  await fillStable(page.getByRole('textbox', { name: 'Ana' }), '60')
  await fillStable(page.getByRole('textbox', { name: 'Beto' }), '40')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByTestId('split-button')).toContainText('custom')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForURL(EXPENSES_OR_GROUP, { timeout: 30_000 })

  await openExpense(page, 'Jantar')
  await expect(paidForRow(page, 'Ana').getByRole('textbox')).toHaveValue('60')
  await expect(paidForRow(page, 'Beto').getByRole('textbox')).toHaveValue('40')
})

test('a failed save keeps what was typed', async ({ page }) => {
  const { groupId } = await newGroup(page)
  await openQuick(page, groupId)
  await page.route(
    (url) => url.pathname.includes('groups.expenses.create'),
    (route) => route.abort(),
  )
  await fillStable(page.locator('input[name="title"]'), 'Uber')
  await fillStable(page.locator('input[name="amount"]'), '23,90')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Could not save').first()).toBeVisible()
  await expect(page.locator('input[name="title"]')).toHaveValue('Uber')
  await expect(page.locator('input[name="amount"]')).toHaveValue('23,90')
  await expect(page).toHaveURL(/\/expenses\/quick$/)
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

  const { groupId, name } = await newGroup(page)
  await page.goto('/groups')
  await page.getByRole('link', { name: 'Add expense' }).click()
  await page.waitForURL(`**/groups/${groupId}/expenses/quick`)
  await page.getByRole('button', { name: 'Ana', exact: true }).click()
  await expect(page.getByText(`Everyone in ${name}`)).toBeVisible()
})

test('switching to another recent group', async ({ page }) => {
  const first = await newGroup(page)
  const second = await newGroup(page)
  await openQuick(page, second.groupId)
  await page.getByRole('button', { name: `Everyone in ${second.name}` }).click()
  await page.getByRole('menuitem', { name: first.name }).click()
  await page.waitForURL(`**/groups/${first.groupId}/expenses/quick`)
})
