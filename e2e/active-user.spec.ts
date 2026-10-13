import {
  addExpense,
  createGroup,
  expenseCard,
  openTab,
  uniqueSuffix,
} from './app'
import { expect, test } from './fixtures'
import { money } from './ui'

// The rest of the suite seeds `newGroup-activeUser` so this dialog stays shut.
// Here it is the subject, so the seeding is switched off.
test.use({ seedActiveUser: false })

/**
 * Puts the browser in the state a first-time visitor is in: the group exists,
 * but this device has never picked an active user. Creating a group through
 * the UI writes `newGroup-activeUser` itself, so it has to be cleared.
 */
async function forgetActiveUser(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem('newGroup-activeUser')
    for (const key of Object.keys(window.localStorage)) {
      if (key.endsWith('-activeUser')) window.localStorage.removeItem(key)
    }
  })
}

test('asks who you are and personalises the expense list', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E ActiveUser ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob', 'Carol'],
  })

  await addExpense(page, groupId, {
    title: 'Dinner',
    amount: '90',
    paidBy: 'Alice',
  })

  await forgetActiveUser(page)
  await page.goto(`/groups/${groupId}/expenses`)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Who are you?')

  await dialog.getByLabel('Bob', { exact: true }).click()
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toBeHidden()

  // The reload is required, not incidental: useActiveUser (src/lib/hooks.ts)
  // reads localStorage once in a useEffect keyed on groupId, so it is not
  // reactive and already-mounted cards keep the previous value until they
  // remount. Asserting before a reload would be asserting a bug fix nobody
  // has made.
  await page.reload()

  // The dialog does not come back...
  await expect(page.getByRole('dialog')).toBeHidden()
  // ...and Bob now sees his own third of Alice's 90 on the card.
  await expect(expenseCard(page, 'Dinner')).toContainText('Your balance:')
  await expect(expenseCard(page, 'Dinner')).toContainText(money(-30))
})

test('pre-fills "Paid by" with the active user', async ({ page }) => {
  const groupId = await createGroup(page, {
    name: `E2E ActiveUserPaidBy ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob', 'Carol'],
  })

  await forgetActiveUser(page)
  await page.goto(`/groups/${groupId}/expenses`)

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Carol', { exact: true }).click()
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toBeHidden()

  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(page.getByTestId('paid-by')).toContainText('Carol')
})

test('the dialog has no "nobody" and closing it does not ask again', async ({
  page,
}) => {
  const groupId = await createGroup(page, {
    name: `E2E ActiveUserNobody ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob'],
  })

  await forgetActiveUser(page)
  await page.goto(`/groups/${groupId}/expenses`)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('radio')).toHaveCount(2)
  await expect(
    dialog.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await page.reload()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('creating a group asks who you are, the first name already picked', async ({
  page,
}) => {
  await page.goto('/groups/create')
  const question = page.getByRole('radiogroup', {
    name: 'Who are you in this group?',
  })
  await expect(question.getByRole('radio')).toHaveCount(3)
  await expect(question.getByRole('radio').first()).toBeChecked()

  const groupId = await createGroup(page, {
    name: `E2E WhoAreYou ${uniqueSuffix()}`,
    participants: ['Alice', 'Bob', 'Carol'],
  })
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(page.getByTestId('paid-by')).toContainText('Alice')

  await openTab(page, 'Settings')
  await page.getByLabel('Bob', { exact: true }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.goto(`/groups/${groupId}/expenses/create`)
  await expect(page.getByTestId('paid-by')).toContainText('Bob')
})
