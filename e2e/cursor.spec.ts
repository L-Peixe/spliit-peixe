import { createGroup, openTab } from './app'
import { expect, test } from './fixtures'

// Desktop rule: everything clickable shows the pointing hand (CLAUDE.md).
const CLICKABLE =
  'a[href], button:not(:disabled), [role="tab"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], label[for]'

async function cursorsThatAreNotPointer(page: import('@playwright/test').Page) {
  return page.locator(CLICKABLE).evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .filter((el) => getComputedStyle(el).cursor !== 'pointer')
      .map((el) => el.outerHTML.slice(0, 80)),
  )
}

test('every clickable element shows the pointing hand', async ({ page }) => {
  await page.goto('/groups')
  expect(await cursorsThatAreNotPointer(page)).toEqual([])

  await createGroup(page, { name: 'E2E Cursor', participants: ['Ana', 'Beto'] })
  expect(await cursorsThatAreNotPointer(page)).toEqual([])

  await openTab(page, 'Settings')
  expect(await cursorsThatAreNotPointer(page)).toEqual([])
})
