# PR 2 — parcelado · Plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** marcar uma despesa como parcelada em "Mais opções": digita o total, nasce a 1/N na
hora e as próximas uma por mês, pela recorrência mensal que já existe, parando na N/N.

**Architecture:** três colunas novas em `Expense` (migration aditiva). Funções puras em
`src/lib/installments.ts` (valores, título). `createExpense` grava a 1ª parcela com
`recurrenceRule: MONTHLY`; `createRecurringExpenses` (`src/lib/api.ts`) calcula valor e título
da próxima a partir do total guardado e não cria link depois da última.

**Tech Stack:** Prisma, tRPC, react-hook-form + zod, Jest, Playwright.

**Spec:** `docs/specs/2026-10-13-tela-unica-e-parcelado.md` §5 (ADR-011). Base: PR 1 (branch `tela-unica`).

## Global Constraints

- O valor digitado é o **total**; a tela mostra *"10x de R$ 120,00"*.
- Centavo que sobra vai **na 1ª**: R$ 100,00 em 3x = 33,34 + 33,33 + 33,33.
- 1ª nasce na hora como *"Nome (1/N)"*; as próximas **uma por mês, no dia** (`calculateNextDate`
  MONTHLY); param na N/N. O saldo mostra só o que já venceu.
- Não combina com recorrência nem com divisão por valor — a tela explica e não salva.
- Editar uma parcela muda só ela; parcelada só se escolhe ao criar (some no editar).
- Título da próxima troca o `(k/N)` do fim; se o usuário apagou o sufixo, acrescenta.
- Dados: `installmentNumber Int?`, `installmentCount Int?`, `installmentTotal Int?` (centavos).
- Parcelas: 2 a 24.

## Review Focus

1. 1ª parcela editada (valor ou nome) antes da 2ª nascer → a 2ª sai do **total**, com o sufixo certo. Unitário (Task 1) cobre título; o valor vem de `installmentTotal` por construção.
2. Grupo aberto meses depois → todas as vencidas nascem de uma vez, e nenhuma depois da N/N. e2e (Task 3).
3. Parcelada + recorrência ou + divisão por valor → erro na tela, nada salvo. Unitário do schema (Task 2).
4. Última parcela editada → continua sem recorrência (não volta a gerar). Por construção: `recurrenceRule NONE`.
5. Total menor que um centavo por parcela (R$ 0,02 em 3x) → erro no schema, nenhuma parcela zero. Unitário (Task 2).

---

### Task 1: Funções das parcelas
**Files:** Create `src/lib/installments.ts`, `src/lib/installments.test.ts`
**Produces:**
```ts
export function installmentAmounts(totalCents: number, count: number): number[] // resto na 1ª
export function installmentTitle(title: string, number: number, count: number): string // troca ou acrescenta " (k/N)"
```
- [ ] Testes: 10000/3 → [3334,3333,3333]; 120000/10 → 10×12000; 5/3 → [3,1,1]; título `'TV'`→`'TV (1/3)'`;
  `'TV (1/3)'`,2,3 → `'TV (2/3)'`; `'TV (parcela)'`,2,3 → `'TV (parcela) (2/3)'`. RED → implementar → GREEN → commit.

### Task 2: Banco, schema e criação
**Files:** `prisma/schema.prisma` + migration, `src/lib/schemas.ts` (`installmentCount: z.number().int().min(2).max(24).optional()`;
superRefine `installmentsWithRecurrence`, `installmentsByAmount`, `installmentTooSmall` quando total < N centavos),
`src/lib/api.ts` (`createExpense`, `createRecurringExpenses`), `messages/*.json`.
- [ ] Testes de schema dos três erros → RED → implementar → GREEN.
- [ ] `createExpense`: com `installmentCount`, grava amount = 1ª parcela, título (1/N), número 1, total, `MONTHLY` + link.
- [ ] `createRecurringExpenses`: se a despesa atual tem `installmentCount`, a nova recebe número k+1, valor e título
  de `installments.ts`; se k+1 == N, `recurrenceRule NONE` e sem link, e o laço para.
- [ ] `npx prisma migrate dev --name installments` no Postgres local; commit.

### Task 3: Tela e e2e
**Files:** `expense-form.tsx` (em "Mais opções", só ao criar: checkbox *"Parcelada"* + select 2–24, linha *"3x de R$ 33,33"*;
recorrência some do editar quando a despesa é parcela), `e2e/installments.spec.ts`.
- [ ] e2e (360 px): data de 2 meses atrás, R$ 100 em 3x → lista mostra `(1/3)`, `(2/3)`, `(3/3)` com 33,34 + 33,33 + 33,33;
  parcelada + "por valor" mostra o aviso e não salva.
- [ ] Suíte inteira contra o build; auditoria 320/360 da tela com "Parcelada" aberta; PR.

## Changelog
- **2026-10-14 — criação.** Plano do PR 2 da spec da tela única.
