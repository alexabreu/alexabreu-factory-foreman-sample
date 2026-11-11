import { expect, test, type Page } from '@playwright/test'

async function addBooks(page: Page, titles: string[]) {
  for (const title of titles) {
    await page.getByTestId('new-title').fill(title)
    await page.getByTestId('add').click()
  }
}

async function expectFocusInApp(page: Page) {
  const where = await page.evaluate(() => {
    const active = document.activeElement
    const app = document.querySelector('#app')
    return {
      onBody: active === null || active === document.body,
      inApp: !!(active && app && app !== active && app.contains(active)),
    }
  })
  expect(where.onBody, 'focus fell to <body>').toBe(false)
  expect(where.inApp, 'focus is not on a control inside #app').toBe(true)
}

test('AC-1: removes an unread and a read book; the summary drops each from both numbers', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma', 'Hyperion' ])
  await page.getByTestId('item').filter({ hasText: 'Emma' }).getByTestId('item-toggle').check()
  await expect(page.getByTestId('summary')).toHaveText('2 of 3 unread')

  // Unread book: the rows below move up.
  await page.getByTestId('item').filter({ hasText: 'Dune' }).getByTestId('item-remove').click()
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma', 'Hyperion' ])
  await expect(page.getByTestId('summary')).toHaveText('1 of 2 unread')

  // Read book: drops from the total only.
  await page.getByTestId('item').filter({ hasText: 'Emma' }).getByTestId('item-remove').click()
  await expect(page.getByTestId('item-title')).toHaveText([ 'Hyperion' ])
  await expect(page.getByTestId('summary')).toHaveText('1 of 1 unread')
})

test('AC-1: every shown row has one Remove button with its own id and the book in its name', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma', 'A very long title that should wrap inside its own label rather than push the Remove button out of its column at the right edge' ])
  await page.getByTestId('item').filter({ hasText: 'Emma' }).getByTestId('item-toggle').check()

  const rows = page.getByTestId('item')
  await expect(rows).toHaveCount(3)
  const ids = new Set<string>()
  const rights = new Set<number>()
  for (let i = 0; i < 3; i++) {
    const row = rows.nth(i)
    const title = (await row.getByTestId('item-title').textContent())!.trim()
    const button = row.getByTestId('item-remove')
    await expect(button).toHaveCount(1)
    await expect(button).toHaveText('Remove')
    await expect(button).toHaveAccessibleName(`Remove ${title}`)
    const id = await button.getAttribute('data-item-id')
    expect(id).toMatch(/^\d+$/)
    ids.add(id!)
    const box = (await button.boundingBox())!
    rights.add(Math.round(box.x + box.width))
  }
  expect(ids.size, 'each Remove carries a distinct data-item-id').toBe(3)
  expect(rights.size, 'Remove buttons form one column').toBe(1)

  // Under a filter, every shown row still has its Remove.
  await page.getByTestId('filter').selectOption('unread')
  await expect(page.getByTestId('item')).toHaveCount(2)
  await expect(page.getByTestId('item-remove')).toHaveCount(2)
})

test('AC-1: a book removed under the Unread filter is gone from the full list too', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma', 'Hyperion' ])
  await page.getByTestId('item').filter({ hasText: 'Dune' }).getByTestId('item-toggle').check()
  await page.getByTestId('filter').selectOption('unread')
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma', 'Hyperion' ])

  await page.getByTestId('item').filter({ hasText: 'Emma' }).getByTestId('item-remove').click()
  await expect(page.getByTestId('item-title')).toHaveText([ 'Hyperion' ])
  await expect(page.getByTestId('summary')).toHaveText('1 of 2 unread')

  await page.getByTestId('filter').selectOption('all')
  await expect(page.getByTestId('item-title')).toHaveText([ 'Dune', 'Hyperion' ])
})

test('AC-1: a removed title can be added again', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma' ])
  await page.getByTestId('item').filter({ hasText: 'Dune' }).getByTestId('item-toggle').check()
  await page.getByTestId('item').filter({ hasText: 'Dune' }).getByTestId('item-remove').click()
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma' ])

  await addBooks(page, [ 'dune' ])
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma', 'dune' ])
  await expect(page.getByTestId('item').filter({ hasText: 'dune' }).getByTestId('item-toggle')).not.toBeChecked()
  await expect(page.getByTestId('summary')).toHaveText('2 of 2 unread')
})

test('AC-1: after a click removal focus stays on a control in the app, down to the last book', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma' ])

  await page.getByTestId('item-remove').first().click()
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma' ])
  await expectFocusInApp(page)

  await page.getByTestId('item-remove').click()
  await expect(page.getByTestId('item')).toHaveCount(0)
  await expect(page.getByTestId('summary')).toHaveText('0 of 0 unread')
  await expectFocusInApp(page)
})

test('AC-1: keyboard removal with Enter and Space keeps focus on a control in the app', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma', 'Hyperion' ])

  await page.getByTestId('item').filter({ hasText: 'Hyperion' }).getByTestId('item-remove').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('item-title')).toHaveText([ 'Dune', 'Emma' ])
  await expectFocusInApp(page)

  await page.getByTestId('item').filter({ hasText: 'Dune' }).getByTestId('item-remove').focus()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma' ])
  await expectFocusInApp(page)

  await page.getByTestId('item-remove').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('item')).toHaveCount(0)
  await expect(page.getByTestId('summary')).toHaveText('0 of 0 unread')
  await expectFocusInApp(page)
})

test('AC-1: a double-click on Remove removes one book only', async ({ page }) => {
  await page.goto('/')
  await addBooks(page, [ 'Dune', 'Emma', 'Hyperion' ])

  await page.getByTestId('item-remove').first().dblclick()
  await expect(page.getByTestId('item-title')).toHaveText([ 'Emma', 'Hyperion' ])
  await expect(page.getByTestId('summary')).toHaveText('2 of 2 unread')
})

for (const key of [ 'Enter', 'Space' ]) {
  test(`AC-1: holding ${key} on Remove removes one book only`, async ({ page }) => {
    await page.goto('/')
    await addBooks(page, [ 'Dune', 'Emma', 'Hyperion' ])

    await page.getByTestId('item-remove').first().focus()
    // Repeated keydowns without a keyup are auto-repeats (event.repeat).
    await page.keyboard.down(key)
    await page.keyboard.down(key)
    await page.keyboard.down(key)
    await page.keyboard.up(key)
    await expect(page.getByTestId('item-title')).toHaveText([ 'Emma', 'Hyperion' ])
    await expect(page.getByTestId('summary')).toHaveText('2 of 2 unread')
  })
}
