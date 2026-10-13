# PR 1 — números pt-BR, divisão que fecha, "Quem é você" e tela única · Plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o formulário de despesa do Spliit vira a tela única da spec (nome, categoria, valor,
quem pagou, divisão, quem participa; o resto em "Mais opções"), todo número digitado segue o
padrão brasileiro e divisão que não fecha não salva.

**Architecture:** uma função de parse pt-BR (`src/lib/number-br.ts`) usada pelo schema zod (que
devolve número/strings com ponto, então o resto do servidor não muda) e pelos cálculos ao vivo
do formulário. Os valores dentro do formulário ficam **como digitados** (com vírgula); valor
pré-preenchido sai de `formatNumberBR`. O formulário existente é reorganizado, não reescrito; a
tela rápida da parte B é apagada.

**Tech Stack:** Next 16, react-hook-form + zod, next-intl, Jest, Playwright.

**Spec:** `docs/specs/2026-10-13-tela-unica-e-parcelado.md` §1–4 (o §5, parcelado, é o PR 2).

## Global Constraints

- Vírgula = decimal, ponto = milhar: `1.234,56` → 1234.56 · `12,5` → 12.5 · `1.000` → 1000.
  `12.50` (ponto sem grupos de 3 dígitos) → erro *"Use vírgula para os centavos"* — nunca converter calado.
- Vale para valor, porcentagem e partes, no grupo e na despesa, **em qualquer língua** do app (os
  e2e rodam em en-US e digitam `12,34`).
- Divisão que não fecha: *"Porcentagem excedida em 10%"* / *"Valor excedido em R$ 5,00"* /
  *"Faltam 10%"* / *"Faltam R$ 5,00"*, em vermelho; não salva; partes sempre > 0.
- Saem do formulário: "Isso é um reembolso", "Moeda da despesa" e a conversão de moeda. Despesa
  antiga em outra moeda mantém `originalAmount/originalCurrency/conversionRate` ao editar.
  "Marcar como pago" (Saldos) continua criando reembolso (`?reimbursement=yes`).
- "Título da despesa" → "Nome da despesa"; "Pago por" → "Quem pagou"; "Pago para" →
  "Quem participa desta despesa?". Textos novos em `messages/pt-BR.json` **e** `en-US.json`.
- Fork vivo (ADR-003): lógica nova em arquivos próprios; o diff do `expense-form.tsx` é grande
  porque a spec manda reorganizá-lo — mas sem reescrever a divisão por valor nem a edição.
- Mobile 320/360 com print; `e2e/cursor.spec.ts` verde; suíte contra `next build && next start`
  com `CI=1` (`APRENDIZADOS.md` #9). Dados de teste inventados.

## Review Focus

1. Editar despesa antiga: valor e partes chegam com vírgula (`12,50`, `33,33`) e salvar sem mexer
   não acusa "Use vírgula". Teste e2e na Task 5 (`expense-edit-delete.spec.ts` já salva sem mexer).
2. Divisão por valor com auto-distribuição: os valores preenchidos sozinhos saem com vírgula e a
   soma fecha (95 em 3 = 31,67 + 31,67 + 31,66). Teste e2e na Task 5 (`split-modes.spec.ts`).
3. Grupo 33,33/33,33/33,34% vindo do padrão do grupo → a despesa abre com vírgula e salva. Unitário
   na Task 1 (`splittingFromGroup`) e e2e na Task 5 (`group-defaults.spec.ts`).
4. "Marcar como pago" continua abrindo o formulário preenchido e salvando o reembolso, sem o
   checkbox. e2e existente `reimbursements.spec.ts` na Task 5.
5. Modal "Quem é você?" fechado sem escolher → não volta a cada visita (grava `None` como hoje).
   e2e na Task 3.

---

### Task 1: Parse pt-BR, um só, em todo lugar

**Files:**
- Create: `src/lib/number-br.ts`, `src/lib/number-br.test.ts`
- Modify: `src/lib/schemas.ts` (amount, `paidFor[].shares`, `participants[].defaultShares`),
  `src/lib/group-defaults.ts` (`splittingFromGroup`, `percentTotal`),
  `src/components/group-default-split.tsx` (`asNumber`, divisão igual ao trocar de modo),
  `src/components/group-form.tsx:82` (`defaultShares` do grupo editado),
  `messages/*.json` (`SchemaErrors.useComma`), `src/lib/schemas.test.ts`, `src/lib/group-defaults.test.ts`

**Interfaces — Produces:**
```ts
export type ParsedNumber = { ok: true; value: number } | { ok: false; error: 'invalidNumber' | 'useComma' }
export function parseNumberBR(text: string): ParsedNumber  // aceita '-' na frente; vazio → invalidNumber
export function numberBR(value: unknown): number            // number passa direto; texto inválido → NaN
export function formatNumberBR(value: number, fractionDigits?: number): string // sem ponto de milhar
```
Regra: `^-?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$` vale; senão, `^-?\d+\.\d+$` → `useComma`; senão `invalidNumber`.
`formatNumberBR(33.33)` → `'33,33'`; `formatNumberBR(12.5, 2)` → `'12,50'`; `formatNumberBR(1)` → `'1'`.

- [ ] **Step 1: testes que falham** (`number-br.test.ts`): `1.234,56`→1234.56; `12,5`→12.5;
  `1.000`→1000; `-12,50`→-12.5; ` 7 `→7; `12.50`→useComma; `1.2345`→useComma; `''`, `abc`,
  `1,234.56`→invalidNumber; `numberBR(5)`→5; `numberBR('12.50')`→NaN; os três `formatNumberBR` acima.
  `schemas.test.ts`: amount `'1.234,56'` → 1234.56; amount `'12.50'` → issue `useComma`; share
  `'33,33'` em BY_PERCENTAGE ×3 + `'33,34'` → shares 3333/3333/3334; group defaultShares `'25,5'` → 2550.
  `group-defaults.test.ts`: `splittingFromGroup` com 3333 → shares `'33,33'`; `percentTotal(['33,33','66,67'])` → 100.
- [ ] **Step 2:** `npx jest src/lib` → falham.
- [ ] **Step 3:** implementar `number-br.ts`; no schema, o branch string do amount e das shares usa
  `parseNumberBR` (erro vira a mensagem `ok:false`), amount devolve número e share devolve
  `String(value)` (com ponto, para o resto do schema e o servidor seguirem iguais). `''` no amount →
  `amountRequired`. `originalAmount`/`conversionRate` **não mudam** (não são mais digitados).
  `SchemaErrors.useComma`: pt-BR *"Use vírgula para os centavos"*, en-US *"Use a comma for the cents"*.
- [ ] **Step 4:** `npx jest src/lib` → passa.
- [ ] **Step 5:** commit `feat(numeros): parse pt-BR único, vírgula decimal e ponto de milhar`.

### Task 2: Rodapé da divisão que não fecha

**Files:**
- Create: `src/lib/split-gap.ts`, `src/lib/split-gap.test.ts`, `src/components/split-gap-footer.tsx`
- Modify: `src/components/group-default-split.tsx` (rodapé de %), `messages/*.json` (`SplitGap.*`)

**Interfaces — Produces:**
```ts
// total e values na unidade da tela (100 para %, reais para valor); soma em centavos como o schema.
export function splitGap(total: number, values: unknown[]): { direction: 'over' | 'under' | null; difference: number }
export function SplitGapFooter(props: { mode: 'BY_PERCENTAGE' | 'BY_AMOUNT'; total: number; values: unknown[]; currency?: Currency }): JSX.Element | null // null quando fecha
```
Textos `SplitGap`: `percentOver` *"Porcentagem excedida em {difference}%"*, `percentUnder`
*"Faltam {difference}%"*, `amountOver` *"Valor excedido em {difference}"*, `amountUnder`
*"Faltam {difference}"* (en-US: *"Percentage exceeded by…"*, *"{difference}% missing"*, *"Amount exceeded by…"*, *"{difference} missing"*).
Valor formatado com `formatCurrency` (já sai `R$ 5,00`); porcentagem com `formatNumberBR`.

- [ ] **Step 1:** testes `splitGap(100, ['60','50'])` → over 10; `splitGap(100, ['33,33','33,33','33,33'])` → under 0.01;
  `splitGap(100, ['50','50'])` → null; `splitGap(95, ['31,67','31,67','31,66'])` → null; valor vazio conta 0.
- [ ] **Step 2:** `npx jest src/lib/split-gap` falha. **Step 3:** implementar; o grupo troca
  `percentFooter` pelo `SplitGapFooter` (mantém "{sum}% de 100%" quando fecha? não: quando fecha, nada).
- [ ] **Step 4:** passa. **Step 5:** commit `feat(divisao): rodapé excedida/faltam`.

### Task 3: "Quem é você neste grupo?"

**Files:**
- Modify: `src/components/group-form.tsx:107-130,350-392`, `src/app/groups/[groupId]/expenses/active-user-modal.tsx:96-135`,
  `messages/*.json` (`GroupForm.Settings`), `e2e/active-user.spec.ts`, `e2e/app.ts` (se `createGroup` precisar)

- [ ] **Step 1: e2e que falha** em `active-user.spec.ts`: criar grupo mostra o card *"Who are you in
  this group?"* com radios dos nomes digitados e o primeiro marcado; ao criar, o "Paid by" de uma
  despesa nova vem com ele. O teste `'lets you decline to pick anyone'` vira: o modal **não** tem
  "nobody"; fechar o modal sem escolher não o reabre ao recarregar.
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** no grupo, o card "Configurações locais" vira um `RadioGroup` com título
  `Settings.ActiveUserField.label` = *"Quem é você neste grupo?"* (en *"Who are you in this group?"*),
  sem descrição nem "Nenhum"; criar = primeiro nome marcado; editar = o ativo do aparelho (nenhum
  marcado se for `None`). Nome renomeado na lista segue marcado (guarda o índice, não o nome). No
  modal, sai a opção `nobody` e o salvar fica desabilitado até escolher.
- [ ] **Step 4:** passa. **Step 5:** commit `feat(grupo): Quem é você neste grupo?`.

### Task 4: Tela única

**Files:**
- Create: `src/lib/suggest-category.ts` (+ teste movido de `quick-expense.test.ts`)
- Modify: `src/app/groups/[groupId]/expenses/expense-form.tsx`, `src/components/add-expense-fab.tsx`,
  `messages/*.json` (`ExpenseForm.*`; `QuickExpense` fica só com `fab`)
- Delete: `src/app/groups/[groupId]/expenses/quick/`, `src/lib/quick-expense.ts`, `src/lib/quick-expense.test.ts`

**Interfaces — Consumes:** Task 1 (`numberBR`, `formatNumberBR`), Task 2 (`SplitGapFooter`).
`suggestCategory(title: string): number` — mesmo código de hoje, só muda de arquivo.

- [ ] **Step 1:** `npx jest src/lib/suggest-category` (teste movido) passa; `npx tsc --noEmit` mostra
  o que ainda importa `quick-expense` → zero ao fim.
- [ ] **Step 2: o formulário**, num `Card` só, nesta ordem: Nome (`name="title"`), Categoria,
  Valor (`R$` + input), Quem pagou (`data-testid="paid-by"`), Modo de divisão
  (`data-testid="split-mode"`) + "Salvar como padrão" ao lado (quando `canSaveDefault`),
  "Quem participa desta despesa?" (as linhas `[data-id]` de hoje, com "Selecionar todos"),
  `SplitGapFooter` ao vivo para % e valor, e o `Collapsible` *"Mais opções"* com Data,
  Recorrência, Notas e Anexos (se ligados). Sem `FormDescription`. O `Collapsible` abre sozinho
  ao editar se a despesa tiver recorrência, notas ou anexos.
- [ ] **Step 3: números:** `enforceCurrencyPattern` deixa só dígitos, `.`, `,` e `-` inicial e
  corta casas depois da **vírgula**; todo `Number(amount|shares)` do arquivo vira `numberBR`;
  pré-preenchidos (`amountAsDecimal`, `shares/100`, `formatAmountAsDecimal` da auto-distribuição,
  `?amount=`) passam por `formatNumberBR`. Valor vazio ao criar (não `0`).
- [ ] **Step 4: sai:** campo "Moeda da despesa", valor original, taxa, os dois `useEffect` de
  conversão, `useCurrencyRate`, a linha de valor original por pessoa e o checkbox de reembolso.
  `submit` continua apagando `originalAmount/Currency/conversionRate` quando não há conversão — e
  mantém os guardados quando a despesa antiga tem (`conversionRequired`).
- [ ] **Step 5: categoria:** ao digitar o nome, `category = suggestCategory(nome)` até o usuário
  escolher à mão (estado local); a sugestão por IA no blur continua, se ligada.
- [ ] **Step 6:** botão flutuante → `/groups/<id>/expenses/create`; apagar a rota `quick` e
  `quick-expense.ts`; `QuickExpense.*` sai das mensagens, menos `fab`.
- [ ] **Step 7:** `npx tsc --noEmit && npm run lint && npx jest` limpos. Commit
  `feat(despesa): tela única; sai a tela rápida, moeda e reembolso do formulário`.

### Task 5: e2e da tela única e a suíte inteira

**Files:**
- Create: `e2e/single-screen.spec.ts`
- Modify: `e2e/app.ts` (`addExpense`: split mode fora do collapsible; data/recorrência dentro de
  "More options"; comentário do amount `'12,34'`), specs que digitam `x.yy` (`split-modes`), `e2e/cursor.spec.ts:28`
- Delete: `e2e/quick-expense.spec.ts` (o teste do botão flutuante vai para `single-screen`),
  `e2e/multi-currency.spec.ts`, `e2e/repayment-currency.spec.ts` (a função saiu da tela — spec §4)

- [ ] **Step 1: testes** em `single-screen.spec.ts` (viewport 360): só nome + valor salva no padrão
  do grupo; trocar quem pagou; desmarcar alguém em "Who is part of this expense?"; `12.50` mostra
  *"Use a comma for the cents"* e não sai da tela; 60% + 50% mostra *"Percentage exceeded by 10%"*
  e não salva; nome "Uber" sugere a categoria Taxi; botão flutuante abre o último grupo ou criar grupo.
- [ ] **Step 2:** subir o build (`APRENDIZADOS.md` #9) e rodar `CI=1 npx playwright test` inteira → verde.
- [ ] **Step 3:** `node scripts/auditoria-mobile.mjs <pasta>` em criar despesa, editar despesa,
  criar grupo e editar grupo; olhar os prints de 320 e 360.
- [ ] **Step 4:** commit `test(e2e): tela única`, push da branch `tela-unica`, PR.

## Changelog
- **2026-10-13 — criação.** Plano do PR 1 da spec da tela única.
