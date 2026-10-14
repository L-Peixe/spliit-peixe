# Spec — tela única de despesa, números em pt-BR e parcelado

> **Desenho aprovado em conversa** (13/10/2026, skill brainstorming: *"sim, perfeito"*).
> **Próximo passo: o Lucas revisar este arquivo.** Aprovado, vem o plano (skill writing-plans)
> e só então o código. Decisões e o porquê: `../DECISOES.md` (ADR-009 a 011).
> Base: partes A e B já no ar (`2026-10-13-padroes-do-grupo-e-despesa-rapida.md`).

## Intenção

Depois de usar as partes A e B, o Lucas achou o formulário completo do Spliit confuso:
- "Pago para" parece que ele está pagando as pessoas. Ele prefere a pergunta **"Quem participa
  desta despesa?"**.
- "Configurações locais / Usuário ativo", na criação do grupo, *"não ficou muito claro"*.
  O "Quem é você?" que já aparece ao abrir o grupo *"é mais direto, mais fácil de entender"*.
- Reembolso e moeda por despesa confundem. *"A moeda tem que ser uma configuração do grupo,
  não da despesa."*
- Número tem que ser como no Brasil: *"vírgula é o que separa decimais e ponto é a cada três
  dígitos… isso é fundamental"*.

**Falha mesmo funcionando:** `12.50` virar R$ 1.250,00 calado; salvar divisão que não fecha;
tela com mais campos à vista do que os quatro essenciais.

---

## 1. Números em pt-BR, em todo campo digitado

- Vírgula = decimal, ponto = milhar: `1.234,56` → 1234,56 · `12,5` → 12,50 · `1.000` → mil.
- Vale para valor, porcentagem e partes, no grupo e na despesa. Valores pré-preenchidos (ex.:
  divisão igual 33,33) aparecem com vírgula.
- **Ambíguo:** `12.50` (ponto sem 3 dígitos depois) → erro no campo: *"Use vírgula para os
  centavos"*. Nunca converter calado.
- Uma função só faz esse parse (hoje há `toNumber`/`parseAmount` em `src/lib/quick-expense.ts`,
  `asNumber`/`percentTotal` em `group-default-split.tsx`/`group-defaults.ts` e
  `replace(/,/g, '.')` nos schemas). Todas passam a usá-la, com teste.

## 2. Divisão que não fecha (grupo e despesa)

- Acima do total: rodapé vermelho *"Porcentagem excedida em 10%"* / *"Valor excedido em
  R$ 5,00"* (no lugar do atual "-10% restantes").
- Abaixo: rodapé vermelho *"Faltam 10%"* / *"Faltam R$ 5,00"*.
- Não salva (nem cria nem edita) enquanto não fechar; partes sempre > 0.

## 3. Grupo: "Quem é você neste grupo?"

- Em criar e editar grupo, o card "Configurações locais / Usuário ativo" vira essa pergunta,
  com os nomes digitados em botões de opção. **Sem** "Não quero selecionar ninguém".
- Ao criar, o primeiro nome já vem marcado; dá para trocar.
- O modal "Quem é você?" (abrir grupo por link, `active-user-modal.tsx`) também perde o
  "ninguém".

## 4. Uma tela só de despesa (criar e editar)

Reorganiza o formulário existente (`expense-form.tsx`), num card só:

```
Nome da despesa      [                     ]
Categoria            [Geral ▾]   ← sugerida pelo nome (suggestCategory) até escolher à mão
Valor                R$ [      ]
Quem pagou           [você ▾]    ← participante ativo do aparelho
Modo de divisão      [Igualmente ▾]  [ ] Salvar como padrão   ← padrão do grupo
Quem participa desta despesa?
  [x] Ana   (R$ 20,00)
  [x] Beto  (R$ 20,00)           ← todos marcados; valores por pessoa como hoje
▸ Mais opções
    Data (hoje) · Recorrência · Parcelada (Nx) · Notas · Anexos (se ligados)
```

- "Título da despesa" vira **"Nome da despesa"**.
- **Sai do formulário:** "Isso é um reembolso" (o "Marcar como pago" da aba Saldos continua
  criando reembolso por dentro) e "Moeda da despesa" (a moeda é do grupo; despesa antiga em
  outra moeda mantém os valores ao editar).
- A **tela rápida da parte B** (`/expenses/quick`, painel "Quem pagou?", Ajustar divisão)
  **sai**; o botão flutuante abre `/expenses/create`. O que serve dela fica: `suggestCategory`
  e as validações iguais às do servidor.
- Os e2e que usam o formulário (`e2e/app.ts`: botão "Create", `paid-by`, `split-mode`,
  `paidForRow`) são atualizados junto.

## 5. Parcelado (em "Mais opções")

- Marca **Parcelada** e escolhe o número de parcelas; o valor digitado é o **total**. A tela
  mostra *"10x de R$ 120,00"*.
- A 1ª parcela nasce na hora como *"Nome (1/10)"*. O centavo que sobra vai **nela**:
  R$ 100,00 em 3x = 33,34 + 33,33 + 33,33.
- As próximas nascem **uma por mês, no dia**, pela recorrência mensal que já existe
  (`createRecurringExpenses` em `src/lib/api.ts`), e param na 10/10. O saldo mostra só o que
  já venceu, como fatura de cartão.
- Não combina com recorrência nem com **divisão por valor** (valor em reais não serve para cada
  parcela) — a tela explica se escolher.
- Editar uma parcela muda só ela. Parcelada só se escolhe ao criar.
- **Dados (migration aditiva):** `Expense.installmentNumber Int?`, `installmentCount Int?`,
  `installmentTotal Int?` (centavos). O título da próxima troca o `(k/N)` do fim; se o usuário
  apagou o sufixo, acrescenta.

---

## Testes

- **Unitário:** parse pt-BR (`1.234,56`, `12,5`, `1.000`, `12.50` → erro, vazio, negativo);
  valores das parcelas (100 em 3x; 1.200 em 10x); título e valor da próxima parcela; rodapé
  excedido/faltando.
- **e2e (360 px):** tela única com só nome + valor salva no padrão do grupo; trocar quem pagou;
  desmarcar alguém em "Quem participa"; `12.50` mostra o erro; 110% bloqueia com "excedida";
  criar grupo com "Quem é você neste grupo?" marcando o primeiro; parcelado com data de 2 meses
  atrás → abrir o grupo mostra 1/3, 2/3 e 3/3 com 33,34 + 33,33 + 33,33.
- Auditoria 320/360 com print; `e2e/cursor.spec.ts` verde; suíte completa contra o build de
  produção (`APRENDIZADOS.md` #9).

## Entrega

Dois PRs: **1)** números + validação + "Quem é você" + tela única; **2)** parcelado.

## Changelog
- **2026-10-14 — PR 2 (§5, parcelado) implementado.** Plano `../plans/2026-10-14-parcelado.md`. Limite: 2 a 24 parcelas.
- **2026-10-14 — PR 1 (§1–4) implementado.** Plano `../plans/2026-10-13-tela-unica.md`. Saíram junto os e2e de moeda por despesa (a função saiu da tela).
- **2026-10-13 — criação.** Desenho aprovado em conversa depois de o Lucas usar A e B. Substitui
  a tela rápida da parte B (ADR-009).
