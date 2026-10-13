# Parte B — despesa em uma tela · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** registrar uma despesa com descrição + valor + ✓, a partir de um botão flutuante, com a
divisão do grupo pré-selecionada e atalhos de "quem pagou" num bottom sheet.

**Architecture:** rota nova `/groups/[groupId]/expenses/quick` com componentes próprios. A lógica
(parse do valor, categoria por palavra-chave, texto da divisão, montagem dos valores da despesa,
rodapé do "Ajustar divisão") vive em funções puras em `src/lib/quick-expense.ts`, testadas em Jest.
Salva pela mesma mutação `groups.expenses.create` do formulário completo.

**Tech Stack:** Next 16 (app router), tRPC, next-intl, vaul (`Drawer`), Jest, Playwright.

**Spec:** `docs/specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md` (Parte B, Erros e bordas, Testes).
Base: a Parte A (`src/lib/group-defaults.ts`: `splittingFromGroup`).

## Global Constraints

- Fork vivo (ADR-003): arquivos novos; nos do Spliit, diff pequeno. `/groups/<id>/expenses/create` **não muda** (os e2e dependem dele).
- Só descrição e valor > 0 são obrigatórios. Valor aceita `12,50` e `12.50`; teclado `inputMode="decimal"`.
- Salvar: ✓ no topo **e** o Enter/"Ir" do teclado (o formulário é um `<form>`).
- Valores enviados como o formulário completo envia: `amount` em centavos (`amountAsMinorUnits`), `paidFor[].shares` já ×100 (igual 100, 25% 2500, 1 parte 100; por valor, centavos).
- Categoria por palavra-chave, **sem IA** (custo zero): Uber/99 → 35 Taxi; iFood/McDonald's → 8 Dining Out; mercado/Assaí/Carrefour → 9 Groceries; Netflix/Spotify → 2 Entertainment. Sem match → 0 General.
- 📷 oculto (parte C). 📅 começa em hoje; mostra dd/mm quando muda.
- Textos novos só em chaves novas `QuickExpense.*` de `messages/pt-BR.json` e `messages/en-US.json`.
- Mobile 320/360 provado com print; desktop com mãozinha (`e2e/cursor.spec.ts` passa a visitar a tela nova).
- Repo público: dados de teste inventados.

## Review Focus

1. Falha de rede ao salvar → o que foi digitado fica na tela e aparece o erro (spec: "sem perder dado"). Teste e2e na Task 5 (`page.route` abortando o tRPC).
2. Sem "você" no aparelho (ou "Ninguém" escolhido antes) → a tela pede "Quem é você?" antes, em vez de salvar com pagador vazio. Teste e2e na Task 3.
3. Grupo de 2 em "Você tem o valor total a receber" → saldo do outro = −valor inteiro. Teste unitário na Task 1 e e2e na Task 5.
4. "Ajustar divisão" em porcentagem que não fecha 100% → ✓ não salva e o rodapé diz quanto falta. Teste e2e na Task 4.
5. Botão flutuante na lista de grupos sem grupo recente → leva a criar grupo (não a uma tela vazia). Teste e2e na Task 5.

---

### Task 1: Funções puras da despesa rápida

**Files:**
- Create: `src/lib/quick-expense.ts`, `src/lib/quick-expense.test.ts`

**Interfaces:**
- Consumes: `splittingFromGroup` (`src/lib/group-defaults.ts`), `amountAsMinorUnits`, `getCurrencyFromGroup` (`src/lib/utils.ts`), `ExpenseFormValues` (`src/lib/schemas.ts`).
- Produces:
  ```ts
  type QuickGroup = Parameters<typeof splittingFromGroup>[0] & { currency: string; currencyCode: string | null }
  export type QuickSplit = { splitMode: SplitMode; paidFor: { participant: string; shares: string }[] }
  export function parseAmount(text: string): number | null        // '12,50' → 12.5; '', '0', 'abc' → null
  export function suggestCategory(title: string): number           // ids da Global Constraints; 0 sem match
  export function describeSplit(group: QuickGroup): string          // 'igualmente' | '25/75' | 'por partes'
  export function fullAmountTo(participantId: string): QuickSplit   // EVENLY, paidFor só [participantId]
  export function quickExpenseValues(input: {
    group: QuickGroup; title: string; amount: number; paidBy: string; split: QuickSplit
    categoryId: number; date: Date; notes?: string
  }): ExpenseFormValues                                              // pronto para groups.expenses.create
  export function splitFooter(mode: SplitMode, amount: number, shares: string[]):
    { done: number; total: number; left: number }                    // para o rodapé do Ajustar divisão
  ```
  `describeSplit` é texto pt-BR curto para o botão (a tela traduz o resto). `splitFooter`: igualmente →
  `{done: n marcados, total: n, left: valor por pessoa}`; porcentagem → soma/100/restante; valores → soma/valor/restante; partes → soma das partes.

- [ ] **Step 1: Testes que falham** (`describe` por função):
  - `parseAmount`: `'12,50'`→12.5, `'12.50'`→12.5, `' 7 '`→7, `''`/`'0'`/`'-3'`/`'abc'`→null;
  - `suggestCategory`: `'Uber pra casa'`→35, `'99 Táxi'`→35, `'iFood jantar'`→8, `'McDonald\'s'`→8, `'Mercado'`→9, `'assaí'`→9 (sem acento e maiúscula também), `'Carrefour'`→9, `'Netflix'`→2, `'Spotify'`→2, `'Presente'`→0;
  - `describeSplit`: EVENLY→`'igualmente'`; 2500/7500→`'25/75'`; BY_SHARES→`'por partes'`;
  - `quickExpenseValues` com R$ 100 pago por Ana no padrão 25/75 → `amount 10000`, `paidBy 'a'`, `splitMode 'BY_PERCENTAGE'`, `paidFor [{a,2500},{b,7500}]`, `isReimbursement false`, `saveDefaultSplittingOptions false`, `recurrenceRule 'NONE'`, `category 9` quando passado;
  - `quickExpenseValues` com `fullAmountTo('b')` → `paidFor [{participant:'b', shares:100}]`, `splitMode 'EVENLY'` (Review Focus 3);
  - `quickExpenseValues` com split `BY_AMOUNT` `['30','20']` em R$ 50 → `paidFor` shares `[3000, 2000]` (centavos, não ×100 de porcentagem);
  - `quickExpenseValues` também passa em `expenseFormSchema.parse` sem erro (o servidor reparseia);
  - `splitFooter('BY_PERCENTAGE', 50, ['75',''])` → `{done:75,total:100,left:25}`; `('BY_AMOUNT', 50, ['30',''])` → `{done:30,total:50,left:20}`; `('EVENLY', 25, ['1','1'])` → `{done:2,total:2,left:12.5}`.
- [ ] **Step 2: Rodar** `npx jest src/lib/quick-expense.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3: Implementar** em `src/lib/quick-expense.ts`. Palavras-chave comparadas sem acento e em minúsculas (`normalize('NFD')`); `99` só como palavra inteira.
- [ ] **Step 4: Rodar** → PASS; `npm run check-types`.
- [ ] **Step 5: Commit** `feat(despesa-rapida): funções puras (valor, categoria, divisão)`.

### Task 2: A tela — descrição, valor, ✓

**Files:**
- Create: `src/app/groups/[groupId]/expenses/quick/page.tsx` (server; só monta o client, como `create/page.tsx`)
- Create: `src/app/groups/[groupId]/expenses/quick/quick-expense-form.tsx`
- Modify: `src/components/category-selector.tsx` (prop opcional `iconOnly?: boolean`: o gatilho mostra só o ícone)
- Modify: `messages/pt-BR.json`, `messages/en-US.json` (`QuickExpense.*`)

**Interfaces:**
- Consumes: Task 1; `trpc.groups.get`, `trpc.categories.list`, `trpc.groups.expenses.create` (com `expenseId: randomId()` como `create-expense-form.tsx`), `useActiveUser`.
- Produces: `QuickExpenseForm({ groupId }: { groupId: string })`; estado `split: QuickSplit` e `paidBy: string` que as Tasks 3 e 4 alteram.

- [ ] **Step 1: Layout da spec.** Cabeçalho: ← (volta para `/groups/<id>`), título "Adicionar despesa", ✓ (`type="submit"`).
  "Com você e: **Todos de <grupo>**". Linha da descrição: `CategorySelector iconOnly` + input com `autoFocus`.
  Linha do valor: símbolo da moeda do grupo + input `inputMode="decimal"` `enterKeyHint="done"`.
  Botão da divisão (Task 3 dá o comportamento): "Pago por **você** e dividido **<describeSplit>**".
  Barra de baixo: nome do grupo · 📅 (input `type="date"`, mostra `dd/mm` quando ≠ hoje) · 📝 (abre `Textarea` de nota).
- [ ] **Step 2: Categoria.** `onChange` da descrição → `suggestCategory`; vira o `defaultValue` do seletor **até** o usuário escolher uma à mão (depois disso, a sugestão para).
- [ ] **Step 3: Salvar.** `onSubmit`: `parseAmount` nulo ou descrição vazia → mensagem no campo, não envia.
  Senão `create.mutateAsync({ groupId, expenseFormValues: quickExpenseValues(...), participantId: paidBy, expenseId })`,
  invalida `groups.expenses` e `groups.stats`, `router.push('/groups/<id>')`. Erro → `toast` destrutivo com a mensagem,
  campos intactos, `expenseId` novo (mesmo motivo do `create-expense-form.tsx`).
- [ ] **Step 4: Verificar** check-types, lint (0 erro), jest.
- [ ] **Step 5: Commit** `feat(despesa-rapida): tela de descrição e valor`.

### Task 3: "Você" e o bottom sheet da divisão

**Files:**
- Create: `src/app/groups/[groupId]/expenses/quick/split-sheet.tsx`
- Create: `src/app/groups/[groupId]/expenses/quick/who-are-you.tsx`
- Modify: `quick-expense-form.tsx`

**Interfaces:**
- Consumes: `describeSplit`, `fullAmountTo`, `splittingFromGroup`.
- Produces: `SplitSheet({ group, me, onPick, onMore })` com `onPick(paidBy: string, split: QuickSplit)`; `WhoAreYou({ group, onChoose })` que grava `localStorage['<grupo>-activeUser']`.

- [ ] **Step 1: Quem é você.** Se `useActiveUser` for nulo, `'None'` ou id que não está no grupo → a tela mostra só `WhoAreYou` (lista de participantes, um toque escolhe) e depois o formulário (Review Focus 2).
- [ ] **Step 2: Sheet** com `Drawer`. Grupo de 2: "Você pagou, dividir <padrão>" · "Você tem o valor total a receber" (`fullAmountTo(outro)`) ·
  "<Outro> pagou, dividir <padrão>" · "<Outro> tem o valor total a receber" (pagador outro, `fullAmountTo(eu)`).
  Grupo de 3+: "Você pagou, dividir <padrão>" e "<Fulano> pagou, dividir <padrão>" para cada um. Sempre por último: "Mais opções".
  O botão da divisão reflete a escolha: "Pago por <X> e dividido <padrão>", "<X> tem o valor total a receber", ou "… dividido de forma personalizada" (Task 4).
- [ ] **Step 3: Verificar** check-types, lint, jest; auditoria do sheet a 320/360 com print.
- [ ] **Step 4: Commit** `feat(despesa-rapida): quem é você e atalhos da divisão`.

### Task 4: Ajustar divisão (só esta despesa)

**Files:**
- Create: `src/app/groups/[groupId]/expenses/quick/adjust-split.tsx`
- Modify: `quick-expense-form.tsx`

**Interfaces:**
- Consumes: `splitFooter`, `QuickSplit`.
- Produces: `AdjustSplit({ group, amount, paidBy, split, onDone, onBack })`, tela cheia por cima do formulário (estado, não rota), `onDone(paidBy, split)`.

- [ ] **Step 1:** "Pago por <X> ✎" (troca o pagador com `Select`). `Tabs` Igualmente / Valores / Porcentagem / Partes.
  Igualmente: caixas por pessoa + "Todos". Os outros: campo `inputMode="decimal"` por pessoa. Rodapé de `splitFooter`:
  "R$ 12,50/pessoa (2 pessoas)", "75% de 100% — 25% restantes", "R$ 30,00 de R$ 50,00", "4 partes"; vermelho quando não fecha.
  Pronto só habilita quando fecha (porcentagem = 100, valores = total, partes > 0, igualmente ≥ 1 marcado) (Review Focus 4).
- [ ] **Step 2: Verificar** check-types, lint, jest; auditoria 320/360 de cada aba com print.
- [ ] **Step 3: Commit** `feat(despesa-rapida): ajustar divisão`.

### Task 5: Botão flutuante, entrada e e2e

**Files:**
- Create: `src/components/add-expense-fab.tsx`
- Modify: `src/app/groups/page.tsx` (FAB com o último grupo de `getRecentGroups()[0]`; sem grupo → `/groups/create`)
- Modify: `src/app/groups/[groupId]/expenses/page.client.tsx` (FAB do grupo atual; o `+` antigo continua indo ao formulário completo)
- Modify: `quick-expense-form.tsx` ("Com você e" abre a lista de grupos recentes; escolher troca para `/groups/<outro>/expenses/quick`; "Mais opções → formulário completo" leva a `/groups/<id>/expenses/create`)
- Create: `e2e/quick-expense.spec.ts` (360 px); Modify: `e2e/cursor.spec.ts` (visita a tela rápida)

**Interfaces:**
- Produces: `AddExpenseFab({ groupId }: { groupId?: string })` — `fixed bottom-4 right-4`, rótulo "Adicionar despesa", alvo ≥ 48 px.

- [ ] **Step 1: e2e que falham:**
  - grupo 25/75 (helpers da parte A) → FAB → "Mercado", "100", Enter → volta ao grupo; a despesa abre em porcentagem 25/75; categoria Groceries;
  - grupo de 2 → sheet → "Beto pagou, dividir igualmente" → salva → saldo de Beto +50;
  - "Você tem o valor total a receber" com R$ 80 → saldo de Beto −80 (Review Focus 3);
  - "Mais opções" → Porcentagem 90/0 → Pronto desabilitado e "10% restantes"; 60/40 → salva 60/40 (Review Focus 4);
  - sem active user → aparece "Quem é você?" antes do formulário (Review Focus 2);
  - tRPC de criar abortado (`page.route('**/api/trpc/groups.expenses.create**', r => r.abort())`) → erro visível, descrição e valor continuam preenchidos (Review Focus 1);
  - lista de grupos sem recentes → FAB leva a `/groups/create` (Review Focus 5); com recente → `/groups/<último>/expenses/quick` e o nome do grupo aparece em cima.
- [ ] **Step 2: Implementar** o FAB e a entrada; rodar `npx playwright test -c playwright.local.config.ts e2e/quick-expense.spec.ts e2e/cursor.spec.ts` → PASS.
- [ ] **Step 3: Suíte completa** contra `next build && next start` com `CI=1` (APRENDIZADOS 9) → verde; `scripts/auditoria-mobile.mjs` + prints da tela rápida, do sheet e do Ajustar divisão a 320/360.
- [ ] **Step 4: Doc** — HANDOFF (sai B, entra C), `docs/README.md` (onde mora a despesa rápida), changelog da spec com as escolhas do executor.
- [ ] **Step 5: Commit e PR** `feat(despesa-rapida): botão flutuante e entrada`; branch `parte-b-despesa-rapida`; `scripts/neon-preview.sh reset` antes do push.
