// Auditoria mobile descartável: cria um grupo de teste e fotografa as telas-chave
// a 320 e 360 px em pt-BR, medindo vazamento horizontal e alvos de toque < 32 px.
// Uso (dev server em :3000): node scripts/auditoria-mobile.mjs <pasta-de-saida>
// Ver docs/APRENDIZADOS.md — "Auditoria mobile".
import { createRequire } from 'module'
const require = createRequire(process.cwd() + '/package.json')
const { chromium } = require('@playwright/test')
const OUT = process.argv[2] ?? '.'
const B = process.env.BASE_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
})
// setup in English
const ctx = await browser.newContext({ locale: 'en-US' })
const p = await ctx.newPage()
await p.goto(B + '/groups/create')
await p.waitForTimeout(3000)
await p.fill('input[name="name"]', 'Casa Lucas e Gio')
await p.fill('input[name="participants.0.name"]', 'Lucas')
await p.fill('input[name="participants.1.name"]', 'Giovana')
await p.fill('input[name="participants.2.name"]', 'Amigo com nome comprido')
await p.getByRole('button', { name: 'Create', exact: true }).click()
await p.waitForURL(/\/groups\/[^/]+\/expenses/, { timeout: 60000 })
const gid = /\/groups\/([^/]+)\/expenses/.exec(p.url())[1]
for (const [t, a] of [
  ['Supermercado Assaí Atacadista — compra do mês', '734,56'],
  ['Uber', '23,90'],
  ['Netflix', '55,90'],
]) {
  await p.goto(`${B}/groups/${gid}/expenses/create`)
  await p
    .getByRole('button', { name: 'Create', exact: true })
    .waitFor({ timeout: 60000 })
  await p.waitForTimeout(1500)
  await p.fill('input[name="title"]', t)
  await p.fill('input[name="amount"]', a)
  await p.getByTestId('paid-by').click()
  await p.getByRole('option', { name: 'Lucas' }).first().click()
  await p.getByRole('button', { name: 'Create', exact: true }).click()
  await p.waitForURL(/\/groups\/[^/]+\/expenses(\?|$)/, { timeout: 60000 })
}
console.log('group', gid)
const pages = [
  '/groups',
  `/groups/${gid}/expenses`,
  `/groups/${gid}/expenses/create`,
  `/groups/${gid}/balances`,
  `/groups/${gid}/stats`,
  `/groups/${gid}/edit`,
  '/groups/create',
]
for (const width of [320, 360]) {
  const c = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width, height: 760 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  await c.addCookies([{ name: 'NEXT_LOCALE', value: 'pt-BR', url: B }])
  await c.addInitScript((g) => {
    localStorage.setItem(`${g}-activeUser`, '')
  }, gid)
  const q = await c.newPage()
  for (const path of pages) {
    await q.goto(B + path)
    await q.waitForTimeout(3500)
    const r = await q.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const off = []
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect()
        if (b.width && (b.right > vw + 1 || b.left < -1)) {
          let anc = el.parentElement,
            clipped = false
          while (anc) {
            const s = getComputedStyle(anc)
            if (/(auto|scroll|hidden)/.test(s.overflowX)) {
              clipped = true
              break
            }
            anc = anc.parentElement
          }
          if (!clipped)
            off.push(
              `${el.tagName.toLowerCase()}.${(el.className?.toString?.() || '').slice(0, 40)} right=${Math.round(b.right)}`,
            )
        }
      }
      const small = [
        ...document.querySelectorAll(
          'button,a,[role=button],input,[role=tab],[role=checkbox]',
        ),
      ].filter((e) => {
        const b = e.getBoundingClientRect()
        return b.width && b.height && (b.height < 32 || b.width < 32)
      }).length
      return {
        vw,
        sw: document.documentElement.scrollWidth,
        off: off.slice(0, 6),
        small,
      }
    })
    const name = `${width}${path.replace(gid, 'G').replace(/\//g, '_')}.png`
    await q.screenshot({ path: `${OUT}/${name}`, fullPage: true })
    console.log(width, path.replace(gid, 'G'), JSON.stringify(r))
  }
  await c.close()
}
await browser.close()
