# Parte A — padrões do grupo · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cada grupo guarda a sua divisão padrão (igualmente / porcentagem / partes), toda despesa
nova nasce com ela, e mudar o padrão deixa uma linha legível na aba Atividade.

**Architecture:** dois campos novos no banco (migration aditiva). Duas funções puras num arquivo
novo (`src/lib/group-defaults.ts`): padrão do grupo → opções da despesa, e antes × depois →
linha do registrinho. O formulário do grupo ganha um bloco novo (componente próprio); o
formulário de despesa troca o `localStorage` pela leitura do grupo.

**Tech Stack:** Next 16, Prisma 7 (Postgres), tRPC, react-hook-form + zod, next-intl, Jest, Playwright.

**Spec:** `docs/specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md` (Parte A, Erros e bordas, Testes).

## Global Constraints

- Fork vivo (ADR-003): código novo em arquivo novo; no que é do Spliit, diff pequeno. Não editar o `README.md` da raiz.
- Unidade das partes = a de `ExpensePaidFor.shares`: 25% = `2500`, 1 parte = `100`.
- Padrões aceitos no grupo: só `EVENLY`, `BY_PERCENTAGE`, `BY_SHARES`. Porcentagem fecha **exatamente 10000**; partes > 0.
- Participante novo no formulário: `0` em porcentagem, `1` em partes. Banco: `@default(100)`.
- Textos novos: chaves **novas** em `messages/pt-BR.json` e `messages/en-US.json` (não mexer nas antigas).
- A linha do registrinho é gravada em **pt-BR** (idioma do produto), em `Activity.data`.
- `localStorage["<grupo>-defaultSplittingOptions"]` é ignorado e o código que o usa sai.
- Moeda ao criar: variável da Vercel se existir; senão pela língua (`pt-BR` → `BRL`, resto → `USD`).
- Toda tela tocada passa por `node scripts/auditoria-mobile.mjs <pasta>` a 320 e 360 px, **com print olhado**.
- Repo público: dados de teste inventados.

## Review Focus

1. Grupo em porcentagem com alguém a **0%** → a despesa nova não pode incluir essa pessoa (o schema de despesa recusa `0`, "noZeroShares"). Teste na Task 2.
2. Remover um participante de grupo em porcentagem → rodapé mostra quanto falta e não salva até fechar 100%. Teste e2e na Task 5.
3. Vírgula decimal (`12,5`) nos campos do grupo → aceita, como na despesa. Teste na Task 1.
4. Grupo antigo (`EVENLY`, partes 100) e editar grupo sem tocar na divisão → comportamento de hoje, e o registrinho **não** inventa linha de "divisão". Testes nas Tasks 2 e 3.
5. "Salvar como padrão" numa despesa por valor ou com só parte do grupo → não pode gravar padrão inválido no grupo. Teste e2e na Task 4.

---

### Task 1: Banco e schema do formulário de grupo

**Files:**
- Modify: `prisma/schema.prisma` (models `Group` e `Participant`)
- Create: `prisma/migrations/<timestamp>_group_default_split/migration.sql` (gerada pelo Prisma)
- Modify: `src/lib/schemas.ts` (`groupFormSchema`)
- Modify: `src/lib/api.ts` (`createGroup`, `updateGroup`: só gravar os campos novos)
- Test: `src/lib/schemas.test.ts`

**Interfaces:**
- Produces: `Group.defaultSplitMode: SplitMode` (`@default(EVENLY)`), `Participant.defaultShares: Int` (`@default(100)`).
- Produces: `GroupFormValues` com `defaultSplitMode: 'EVENLY'|'BY_PERCENTAGE'|'BY_SHARES'` e
  `participants[].defaultShares: number` (inteiro ×100 na **saída**; a entrada aceita `string | number`, como `paidFor.shares` da despesa).
  Exporte também `GroupFormInput = z.input<typeof groupFormSchema>`.

- [ ] **Step 1: Subir o banco de dev** (CLAUDE.md § Rodando na nuvem) e confirmar `npm test` verde antes de mexer.
- [ ] **Step 2: Testes que falham** em `schemas.test.ts`, bloco `describe('groupFormSchema, divisão padrão')`:
  - porcentagem `['25','75']` → sucesso, saída `defaultShares` `[2500, 7500]`;
  - porcentagem `['25','65']` → issue `'percentageSum'` em `path: ['participants']`;
  - porcentagem `['12,5','87,5']` → sucesso, `[1250, 8750]`;
  - partes `['1','3']` → `[100, 300]`; partes `['0','1']` → issue `'noZeroShares'`;
  - `EVENLY` com qualquer valor → sucesso, `defaultShares` vira `100` para todos;
  - `defaultSplitMode: 'BY_AMOUNT'` → falha;
  - sem `defaultSplitMode` nem `defaultShares` (cliente antigo) → sucesso, `EVENLY` / `100`.
- [ ] **Step 3: Rodar** `npx jest src/lib/schemas.test.ts` → FAIL.
- [ ] **Step 4: Implementar.** Campos no Prisma; `npx prisma migrate dev --name group_default_split`
  (conferir que o SQL é só `ADD COLUMN ... DEFAULT`). No schema, reaproveitar a mesma normalização
  de vírgula e o mesmo `Math.round(Number(x) * 100)` da despesa; checagens no `superRefine` que já existe.
  Em `api.ts`, gravar `defaultSplitMode` no grupo e `defaultShares` em `createMany`/`updateMany`.
- [ ] **Step 5: Rodar** jest + `npm run check-types` → PASS.
- [ ] **Step 6: Commit** `feat(grupo): divisão padrão no banco e no schema`.

### Task 2: Padrão do grupo → opções da despesa (função pura)

**Files:**
- Create: `src/lib/group-defaults.ts`
- Test: `src/lib/group-defaults.test.ts`

**Interfaces:**
- Consumes: campos da Task 1.
- Produces:
  ```ts
  type GroupWithDefaults = {
    defaultSplitMode: SplitMode
    participants: { id: string; name: string; defaultShares: number }[]
  }
  export function splittingFromGroup(group: GroupWithDefaults): {
    splitMode: SplitMode
    paidFor: { participant: string; shares: string }[]
  }
  ```
  `shares` é string como o formulário de despesa já espera (`'1'` em igualmente; `defaultShares / 100` nos outros).

- [ ] **Step 1: Testes que falham:**
  - `EVENLY` com 3 pessoas → `splitMode 'EVENLY'`, 3 linhas, `shares '1'`;
  - 25/75 (`2500`, `7500`) → `'BY_PERCENTAGE'`, `['25','75']`;
  - partes 1:3 (`100`, `300`) → `'BY_SHARES'`, `['1','3']`;
  - porcentagem com alguém em `0` → essa pessoa **fora** de `paidFor` (Review Focus 1);
  - grupo antigo (`EVENLY`, todos `100`) → igual ao primeiro caso.
- [ ] **Step 2: Rodar** `npx jest src/lib/group-defaults.test.ts` → FAIL.
- [ ] **Step 3: Implementar** `splittingFromGroup`.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit** `feat(grupo): converte padrão do grupo em opções de despesa`.

### Task 3: Registrinho — o que mudou no grupo

**Files:**
- Modify: `src/lib/group-defaults.ts` (função nova), `src/lib/group-defaults.test.ts`
- Modify: `src/lib/api.ts:299-307` (`updateGroup` passa `data`)
- Modify: `src/app/groups/[groupId]/activity/activity-item.tsx` (mostra `data` no `UPDATE_GROUP`)

**Interfaces:**
- Produces:
  ```ts
  type GroupSnapshot = {
    name: string
    currencyCode: string | null
    defaultSplitMode: SplitMode
    participants: { id?: string; name: string; defaultShares: number }[]
  }
  export function describeGroupChanges(before: GroupSnapshot, after: GroupSnapshot): string | undefined
  ```
  Partes separadas por `"; "`, nesta ordem, só as que mudaram:
  `nome: Casa → Casa nova` · `moeda: USD → BRL` · `entrou: Ana` · `saiu: Beto` ·
  `divisão: igualmente → 25% / 75%`. Divisão escrita como: `igualmente`, `25% / 75%`
  (ordem dos participantes), `partes 1 / 3`. Nada mudou → `undefined`.

- [ ] **Step 1: Testes que falham** — um por parte acima, um combinando duas, um com a string exata
  `'divisão: igualmente → 25% / 75%'`, um em que só o nome de um participante mudou na divisão
  igual (não gera `divisão:`, Review Focus 4), e um sem mudança → `undefined`.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.** Em `updateGroup`, montar `before` de `existingGroup` e `after` de
  `groupFormValues` (participante sem `id` = entrou) e passar `data: describeGroupChanges(...)` para o `logActivity` que já existe.
  Em `activity-item.tsx`, quando `UPDATE_GROUP` e `activity.data`, uma segunda linha
  `text-xs text-muted-foreground` com o texto (sem passar por `t.rich`).
- [ ] **Step 4: Rodar** jest + check-types → PASS.
- [ ] **Step 5: Commit** `feat(atividade): registra o que mudou no grupo`.

### Task 4: Formulário do grupo e formulário de despesa

**Files:**
- Create: `src/components/group-default-split.tsx` (o bloco "Como vocês costumam dividir?")
- Modify: `src/components/group-form.tsx` (tipos de input, valores iniciais, renderizar o bloco, `append` com `defaultShares`)
- Modify: `src/app/groups/create/page.tsx` (moeda pela língua)
- Modify: `src/app/groups/[groupId]/expenses/expense-form.tsx` (`getDefaultSplittingOptions` e `persistDefaultSplittingOptions`)
- Modify: `messages/pt-BR.json`, `messages/en-US.json` (chaves novas em `GroupForm.DefaultSplit`)

**Interfaces:**
- Consumes: `GroupFormInput` (Task 1), `splittingFromGroup` (Task 2), `trpc.groups.update`.
- Produces: `<GroupDefaultSplit form={form} />` — recebe o `form` do react-hook-form do grupo.

- [ ] **Step 1: Bloco do grupo.** Seletor de 3 opções com o `Tabs` de `src/components/ui/tabs.tsx`
  (Igualmente / Por porcentagem / Por partes), ligado a `defaultSplitMode`. Fora de Igualmente:
  uma linha por participante (nome + campo `inputMode="decimal"` em `participants.N.defaultShares`,
  sufixo `%` em porcentagem) e rodapé vivo: porcentagem `"{soma}% de 100% · {resto}% restantes"`
  (vermelho quando ≠ 100); partes `"{n} partes"`. Mostrar o erro `percentageSum` do schema.
  No `group-form.tsx`: valores iniciais do grupo existente com `defaultShares / 100` em string;
  grupo novo `EVENLY`; "Adicionar participante" faz `append({ name: '', defaultShares: modo === 'BY_PERCENTAGE' ? '0' : '1' })`.
- [ ] **Step 2: Moeda pela língua.** Em `create/page.tsx`: `env.DEFAULT_CURRENCY_CODE ?? env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE ?? ((await getUserLocale()) === 'pt-BR' ? 'BRL' : 'USD')`; apagar o `TODO` de `group-form.tsx:84`.
- [ ] **Step 3: Despesa lê do grupo.** `getDefaultSplittingOptions(group)` passa a ser `splittingFromGroup(group)`
  (sai a leitura e a limpeza do `localStorage`). `persistDefaultSplittingOptions` passa a chamar
  `trpc.groups.update` com o grupo atual + o novo padrão (porcentagem/partes: `shares` da despesa;
  igualmente: `EVENLY`). A caixa "Salvar como padrão" só aparece quando o modo não é `BY_AMOUNT`
  **e** todos os participantes estão marcados (Review Focus 5); em partes, nenhuma parte 0.
  Depois de salvar, invalidar a query do grupo (`utils.groups.get.invalidate`).
- [ ] **Step 4: Verificar** `npm run check-types && npm run lint && npm test` → verdes.
- [ ] **Step 5: Auditoria mobile** do criar grupo e do editar grupo (cada modo aberto) a 320 e 360 px,
  olhando os prints: rodapé sem quebrar, campos % alinhados, alvos ≥ 32 px.
- [ ] **Step 6: Commit** `feat(grupo): formulário da divisão padrão; despesa nasce com o padrão do grupo`.

### Task 5: e2e da parte A

**Files:**
- Create: `e2e/group-defaults.spec.ts` (`test.use({ viewport: { width: 360, height: 760 } })`)
- Modify: `e2e/app.ts` só se faltar helper (ex.: `setGroupDefaultSplit(page, mode, values)`)

- [ ] **Step 1: Escrever os testes** (helpers de `e2e/app.ts`; nomes inventados):
  - criar grupo 2 pessoas em porcentagem 25/75 → nova despesa só com título e valor 100 → abrir a despesa:
    modo porcentagem, 25 e 75;
  - editar grupo para partes 1/3 → aba Atividade mostra `divisão: 25% / 75% → partes 1 / 3`;
  - grupo em porcentagem com 90/0 → Salvar bloqueado, rodapé "10% restantes";
  - remover um participante de grupo 50/50 → não salva até refechar 100% (Review Focus 2);
  - despesa por valor → caixa "Salvar como padrão" não aparece (Review Focus 5).
- [ ] **Step 2: Rodar** contra o dev server: `E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/group-defaults.spec.ts`
  (Chromium do container: `APRENDIZADOS.md` linha 2) → PASS; depois a suíte e2e inteira → verde
  (grupos antigos seguem como antes, Review Focus 4).
- [ ] **Step 3: Commit** `test(e2e): divisão padrão do grupo`.

### Task 6: PR A

- [ ] **Step 1:** `docs/HANDOFF.md` (sai o item da parte A, entra a parte B), `docs/README.md` (tabela
  "onde mora cada coisa": `group-defaults.ts`, `group-default-split.tsx`), changelog da spec.
- [ ] **Step 2:** `scripts/neon-preview.sh reset` antes do push (a preview recebe a migration limpa).
- [ ] **Step 3:** push na branch `parte-a-padroes-do-grupo`, PR com prints 320/360 e a lista de verificações;
  conferir no log do build do preview que a migration rodou no host `ep-curly-lake` (não `ep-old-rain`).
