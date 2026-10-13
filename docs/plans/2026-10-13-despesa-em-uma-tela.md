# Plano — adicionar despesa em uma tela

> **Plano vivo** (ADR-004). Reescrito conforme avança; executou, morre e vira código +
> changelog. Avaliado pela última vez em **13/10/2026**.

| Etapa | Estado |
|---|---|
| **Aprovação deste desenho pelo Lucas** — nada se coda antes (gate da skill brainstorming) | ⏳ pendente com o Lucas — 13/10 |
| Ver as telas do Splitwise do Lucas (prints do celular dele) | ⏳ pendente com o Lucas — 13/10 |
| Tela nova + bottom sheets de "pago por" e "divisão" | ⏳ pendente — 13/10 |
| Botão "+" no grupo e na tela inicial (escolher o grupo) | ⏳ pendente — 13/10 |
| Padrões BR (R$, dd/mm, categoria por palavra-chave mínima) | ⏳ pendente — 13/10 |
| Teste e2e a 360 px + auditoria visual 320/360 | ⏳ pendente — 13/10 |

## O problema, medido

Auditoria de 13/10 (`registro/2026-10-13-levantamento-inicial.md`): **nenhuma tela estoura a
largura** a 320 e 360 px. O que atrasa é o formulário de criar despesa
(`src/app/groups/[groupId]/expenses/expense-form.tsx`, 1.524 linhas): título, data, moeda,
categoria, **valor só no 5º campo**, reembolso, "pago por" **sem valor padrão**, notas,
recorrência — e embaixo um segundo cartão com a lista de "pago para". Moeda padrão USD.

## A tela

O fluxo do Splitwise, de memória — **conferir com os prints do Lucas antes de codar**:

```
┌──────────────────────────────┐
│ ✕   Nova despesa      Salvar │
│ Com você e: [Casa ▾]         │  ← grupo (o último usado vem marcado)
│                              │
│ 🛒  Descrição                │  ← foco aqui ao abrir; ícone = categoria sugerida
│ R$  0,00                     │  ← teclado numérico
│                              │
│ Pago por [você] e dividido   │  ← cada palavra entre [] abre um bottom sheet
│ [igualmente]                 │
│                              │
│ [📅 hoje] [📝 nota] [📷] [⋯] │  ← extras opcionais, fechados
└──────────────────────────────┘
```

- **Padrões que dispensam toque:** pagador = eu (o participante ativo do aparelho até o
  login existir); divisão = a padrão do grupo (o Spliit já guarda em
  `localStorage["<grupo>-defaultSplittingOptions"]`); data = hoje; moeda = a do grupo.
- **Sheet "pago por":** lista de participantes, um toque escolhe e fecha.
- **Sheet "divisão":** abas igualmente / valores / % / partes, com quem participa marcado.
  Explicar "por partes" em uma linha (*"75/25 = 3 partes e 1 parte"*). "Por ajuste" fica
  para o item 6 do roadmap.
- **"⋯ mais opções"** abre o formulário completo de hoje com o que já foi digitado — nada se
  perde e nenhuma função antiga some.
- **Salvar** no topo e também fixo embaixo, no alcance do polegar, respeitando a área segura
  do iPhone. Alvo de toque mínimo 44 px.
- Categoria: palavra-chave mínima embutida (uber, 99 → Transporte; ifood, mcdonald →
  Restaurante; netflix, spotify → Assinaturas; mercado, assai, carrefour → Mercado).
  A lista completa e o "aprender" são o item 2 do roadmap.

## Onde mora (fork vivo, ADR-003)

- Componentes novos em arquivos novos (ex.: `src/app/groups/[groupId]/expenses/quick/…`,
  `src/components/quick-expense/…`). Reusar o schema (`src/lib/schemas.ts`), a mutação de
  criar despesa (tRPC) e o `Drawer` que já existe (`src/components/ui/drawer.tsx`).
- No código antigo, só o mínimo: o botão "+" passa a abrir a tela nova; o formulário completo
  continua em `/expenses/create` (os testes e2e atuais dependem dele).
- Textos em `messages/pt-BR.json` e `messages/en-US.json` (chaves novas, sem mexer nas antigas).
- Moeda padrão: `DEFAULT_CURRENCY_CODE=BRL` na Vercel (tarefa do Lucas ou com autorização).

## Decisões minhas (o Lucas pode vetar)

Saíram da leitura do plano como construtor (o "builder check" da skill brainstorming):

- **Ninguém escolheu "quem é você" no aparelho:** a tela abre o seletor de participante antes,
  uma vez; a escolha vira o pagador padrão.
- **Grupo na tela inicial:** a lista é a dos grupos recentes do aparelho (o que o Spliit já
  guarda); o último usado vem marcado. Com login, vira a lista de grupos da conta.
- **Categoria por palavra-chave** aponta para as categorias que já existem (Transporte → Taxi,
  Restaurante → Dining Out, Mercado → Groceries; **não existe "Assinaturas"** no original —
  Netflix/Spotify vão para Entertainment até a lista brasileira, item 2 do roadmap).
- **Reembolso, recorrência, notas, anexos e moeda** ficam em "mais opções".
- **Desktop** usa a mesma tela, centralizada e com largura máxima.
- **Ponytail ao codar:** o mínimo que funciona, reaproveitando schema, mutação e `Drawer`.

## Pronto quando

- Do "+" ao "Salvar": descrição, valor e **um toque** para o caso comum.
- 320 e 360 px sem vazamento, alvos ≥ 44 px, teclado não cobre o botão de salvar — com print.
- e2e novo cobrindo: criar pelo fluxo rápido, trocar pagador, trocar divisão, "mais opções"
  levando os valores. `npm run check-types`, `lint` e `test` limpos.

## Changelog
- **2026-10-13 — criação.** Desenho inicial a partir da auditoria mobile e do fluxo do
  Splitwise descrito pelo Lucas.
