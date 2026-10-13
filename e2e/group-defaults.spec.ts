import { Page } from '@playwright/test'
import {
  addExpense,
  createGroup,
  openExpense,
  openTab,
  paidForRow,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { fillStable, selectRadixOption } from './ui'

// Part A of docs/specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md, on a phone.
test.use({ viewport: { width: 360, height: 760 } })

type Mode = 'Evenly' | 'By percentage' | 'By shares'

async function setDefaultSplit(
  page: Page,
  mode: Mode,
  values: Record<string, string> = {},
) {
  await page.getByRole('tab', { name: mode, exact: true }).click()
  for (const [name, value] of Object.entries(values)) {
    await fillStable(
      page.getByRole('textbox', { name: `Share of ${name}`, exact: true }),
      value,
    )
  }
}

async function saveSettings(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
}

async function expectSavedMode(page: Page, groupId: string, mode: Mode) {
  await expect
    .poll(
      async () => {
        await page.goto(`/groups/${groupId}/edit`)
        return page
          .getByRole('tab', { name: mode, exact: true })
          .getAttribute('aria-selected', { timeout: 30_000 })
      },
      { timeout: 30_000 },
    )
    .toBe('true')
}

async function groupWithDefault(
  participants: string[],
  page: Page,
  mode: Mode,
  values: Record<string, string>,
) {
  const groupId = await createGroup(page, {
    name: `E2E Default ${uniqueSuffix()}`,
    participants,
  })
  await openTab(page, 'Settings')
  await setDefaultSplit(page, mode, values)
  await saveSettings(page)
  await expectSavedMode(page, groupId, mode)
  return groupId
}

test('a new expense starts with the group default (25/75)', async ({
  page,
}) => {
  const groupId = await groupWithDefault(
    ['Ana', 'Beto'],
    page,
    'By percentage',
    { Ana: '25', Beto: '75' },
  )

  // Only title, amount and payer: the split comes from the group.
  await addExpense(page, groupId, {
    title: 'Mercado',
    amount: '100',
    paidBy: 'Ana',
  })
  await openExpense(page, 'Mercado')
  // A non-even split opens with the advanced options already expanded.
  await expect(page.getByTestId('split-mode')).toContainText('By percentage')
  await expect(paidForRow(page, 'Ana').getByRole('textbox')).toHaveValue('25')
  await expect(paidForRow(page, 'Beto').getByRole('textbox')).toHaveValue('75')
})

test('changing the default leaves a line in Activity', async ({ page }) => {
  const groupId = await groupWithDefault(
    ['Ana', 'Beto'],
    page,
    'By percentage',
    { Ana: '25', Beto: '75' },
  )
  await setDefaultSplit(page, 'By shares', { Ana: '1', Beto: '3' })
  await saveSettings(page)
  await expectSavedMode(page, groupId, 'By shares')

  await openTab(page, 'Activity')
  await expect(
    page.getByText('divisão: 25% / 75% → partes 1 / 3', { exact: true }),
  ).toBeVisible()
})

test('percentages that do not add up to 100 are not saved', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Default ${uniqueSuffix()}`,
    participants: ['Ana', 'Beto'],
  })
  await openTab(page, 'Settings')
  await setDefaultSplit(page, 'By percentage', { Ana: '90', Beto: '0' })
  await expect(page.getByText('90% of 100% · 10% left')).toBeVisible()
  await saveSettings(page)
  await expectSavedMode(page, groupId, 'Evenly')
})

test('removing someone asks to close 100% again', async ({ page }) => {
  const groupId = await groupWithDefault(
    ['Ana', 'Beto', 'Caio'],
    page,
    'By percentage',
    { Ana: '50', Beto: '25', Caio: '25' },
  )
  const caioRow = page
    .locator('li')
    .filter({ has: page.locator('input[name="participants.2.name"]') })
  await caioRow.getByRole('button').click()
  await expect(page.getByText('75% of 100% · 25% left')).toBeVisible()

  await setDefaultSplit(page, 'By percentage', { Ana: '50', Beto: '50' })
  await expect(page.getByText('100% of 100% · 0% left')).toBeVisible()
  await saveSettings(page)
  await expect
    .poll(async () => {
      await page.goto(`/groups/${groupId}/edit`)
      return page.locator('input[name="participants.2.name"]').count()
    })
    .toBe(0)
})

test('an expense split by amount cannot become the group default', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Default ${uniqueSuffix()}`,
    participants: ['Ana', 'Beto'],
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  const saveAsDefault = page.getByText('Save as default splitting options')
  await expect(saveAsDefault).toBeVisible()
  await selectRadixOption(page, page.getByTestId('split-mode'), /By amount/)
  await expect(saveAsDefault).toHaveCount(0)
})

test('saving a default from an expense keeps people added meanwhile', async ({
  page,
  context,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E Default ${uniqueSuffix()}`,
    participants: ['Ana', 'Beto'],
  })
  // The expense form is open on this screen...
  await page.goto(`/groups/${groupId}/expenses/create`)
  const create = page.getByRole('button', { name: 'Create', exact: true })
  await expect(create).toBeVisible({ timeout: 30_000 })

  // ...while someone joins the group on another one.
  const other = await context.newPage()
  await other.goto(`/groups/${groupId}/edit`)
  await other.getByRole('button', { name: 'Add participant' }).click()
  await fillStable(other.locator('input[name="participants.2.name"]'), 'Caio')
  await other.getByRole('button', { name: 'Save', exact: true }).click()
  await expect
    .poll(async () => {
      await other.goto(`/groups/${groupId}/edit`)
      return other.locator('input[name="participants.2.name"]').inputValue()
    })
    .toBe('Caio')

  await fillStable(page.locator('input[name="title"]'), 'Mercado')
  await fillStable(page.locator('input[name="amount"]'), '100')
  await selectRadixOption(page, page.getByTestId('paid-by'), 'Ana')
  await page.getByRole('button', { name: /Advanced splitting options/ }).click()
  await page.getByText('Save as default splitting options').click()
  await create.click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses(\?|$)/, { timeout: 30_000 })

  await page.goto(`/groups/${groupId}/edit`)
  await expect(page.locator('input[name="participants.2.name"]')).toHaveValue(
    'Caio',
    { timeout: 30_000 },
  )
})
