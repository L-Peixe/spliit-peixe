# Spec — padrões do grupo (A) e despesa em uma tela (B)

> **Design aprovado em conversa** (13/10/2026, skill brainstorming). Esta spec é o que vai para o
> plano de implementação; **nenhum código antes de o Lucas aprovar este arquivo.**
> Decisões e o porquê: `../DECISOES.md` (ADR-006 a 008). Parte C (foto) tem spec própria, depois.

## Intenção

A dor é registrar a despesa na correria. O Lucas quer que **a configuração more na criação do
grupo** — *"o máximo que der pra padronizar na hora da criação do grupo é o que vai ser o nosso
vencedor da praticidade"* — para que **adicionar despesa seja seco**: *"a despesa foi isso, o
valor foi esse, enviar, acabou"*. O padrão vem **pré-selecionado e nunca travado**: *"se eu quiser
alterar, é só apertar um botão no lugar que tá pré-selecionado"*.

Caso real que a spec tem que atender: o Lucas tem um grupo **50/50** e outro **25/75**. Não
existe "tipo casal" nem padrão embutido — cada grupo escolhe o seu.

**Não-objetivos:** login (roadmap 1), categorias brasileiras (roadmap 2), foto (parte C),
divisão por ajuste, padrão "por valor fixo" no grupo, dois apps ou dois modos.

**Falha mesmo funcionando:** a tela rápida pedir mais de descrição + valor no caso comum; o
padrão do grupo ficar só num aparelho; mudar o padrão sem deixar rastro de quem mudou e o quê.

---

## Parte A — padrões do grupo

### O que o usuário vê
**Criar e editar grupo** (`src/components/group-form.tsx`), depois da lista de participantes:

```
Como vocês costumam dividir?
( Igualmente )( Por porcentagem )( Por partes )
  Lucas     [ 25 ] %
  Giovana   [ 75 ] %
  ─────────────────────
  100% de 100%  ·  0% restantes
```
- Em **Igualmente**, os campos por pessoa somem.
- Em **Por porcentagem**, só salva com soma exata de 100%. Rodapé vivo como no Splitwise.
- Em **Por partes**, números maiores que zero (aceita decimal; guardado ×100, como o Spliit já
  faz). Rodapé: "4 partes".
- Participante novo: o formulário preenche 0% (porcentagem) ou 1 parte (partes). Em porcentagem
  isso obriga a refechar 100% antes de salvar. (O valor do banco, 100, só vale para grupos
  antigos em "igualmente", onde é ignorado.)
- **Moeda:** continua o seletor que já existe no grupo. Ao **criar**, vem marcada pela língua do
  aparelho (pt → BRL), resolvendo o `TODO` de `group-form.tsx:84`. Sem variável na Vercel.

### Dados (migration aditiva)
- `Group.defaultSplitMode SplitMode @default(EVENLY)` — só `EVENLY`, `BY_PERCENTAGE`,
  `BY_SHARES` são aceitos na validação do formulário de grupo.
- `Participant.defaultShares Int @default(100)` — **mesma unidade de `ExpensePaidFor.shares`**:
  25% = `2500`, 1 parte = `100`. Grupos existentes ficam `EVENLY` = comportamento de hoje.
- `groupFormSchema` (`src/lib/schemas.ts`) ganha `defaultSplitMode` e `participants[].defaultShares`,
  com a regra de soma 10000 em porcentagem (mesma checagem que já existe para despesa).

### Onde o padrão é lido
- `getDefaultSplittingOptions(group)` em `expense-form.tsx` passa a ler **do grupo** (servidor),
  não do `localStorage`. Todos os participantes entram; o modo e as partes vêm do grupo.
- A caixa "Salvar como opções de divisão padrão" do formulário completo passa a **gravar no
  grupo** (mesma API de editar grupo) — deixa de ser por aparelho.
- O `localStorage["<grupo>-defaultSplittingOptions"]` antigo é ignorado (minha decisão: o padrão
  do grupo sempre existe; um padrão salvo só num aparelho não sobrevive).

### O "registrinho"
- `updateGroup` (`src/lib/api.ts`) já grava `UPDATE_GROUP` com **quem** mudou. Passa a gravar em
  `data` **o quê** mudou, numa linha legível: nome, moeda, participantes entrando/saindo e
  divisão padrão (`igualmente → 25% / 75%`).
- `activity-item.tsx` mostra essa linha abaixo de "Fulano modificou as configurações do grupo".
  Acesso: aba **Atividade** do grupo, que já existe.
- A função que monta a linha é pura e tem teste unitário.

---

## Parte B — despesa em uma tela

### Entrada
- Botão flutuante grande **"Adicionar despesa"** (embaixo, à direita) na lista de grupos e
  dentro do grupo, como nos prints do Splitwise.
- Na lista de grupos, a tela abre com o **último grupo usado** marcado; o nome aparece em cima
  ("Com você e: Todos de *grupo*") e embaixo, para não lançar no grupo errado. Sem grupo
  recente: "Escolher grupo".
- O formulário completo de hoje continua em `/groups/<id>/expenses/create` (os e2e dependem dele),
  acessível por "Mais opções → formulário completo".

### A tela (rota nova, arquivos novos — fork vivo)
```
←  Adicionar despesa                      ✓
Com você e: [Todos de Casa]
[🧾]  Insira a descrição          ← foco ao abrir
[R$]  0,00                        ← teclado numérico (inputmode="decimal")
[ Pago por você e dividido 25/75 ]   ← pré-selecionado pelo grupo
────────────────────────────────────
[Casa]                 [📅] [📷] [📝]
```
- **Salvar:** ✓ no topo **e** o "Enviar/Ir" do teclado. Valida só descrição e valor > 0.
- **Ícone da categoria:** sugerido pela descrição com uma lista mínima de palavras-chave apontando
  para as categorias que já existem (Uber/99 → Taxi; iFood/McDonald's → Dining Out;
  mercado/Assaí/Carrefour → Groceries; Netflix/Spotify → Entertainment). Um toque abre o
  seletor de categoria que já existe. A lista brasileira é o roadmap 2.
- **"Você"** = participante ativo do aparelho (o "Quem é você?" do Spliit). Se não houver,
  a tela pede uma vez antes.
- **📅** data (hoje marcada; mostra dd/mm quando muda) · **📝** nota · **📷** fica oculto até a
  parte C.

### O botão da divisão
Toque abre um bottom sheet (`src/components/ui/drawer.tsx`, já existe):
- **Grupo de 2:** "Você pagou, dividir *padrão*" · "Você tem o valor total a receber" ·
  "*Outro* pagou, dividir *padrão*" · "*Outro* tem o valor total a receber".
- **Grupo de 3+:** "Você pagou, dividir *padrão*" e "*Fulano* pagou, dividir *padrão*" para cada um.
- **Sempre, no fim: "Mais opções"** → tela **Ajustar divisão**: "Pago por *X* ✎" e abas
  Igualmente (com caixas de quem participa e "Todos") / Valores / Porcentagem / Partes, com
  rodapé vivo ("R$ 12,50/pessoa (2 pessoas)", "75% de 100% — 25% restantes",
  "R$ 30,00 de R$ 50,00"). Vale **só para esta despesa**.
- *Padrão* é escrito como o grupo define: "igualmente", "25/75", "por partes".

### Reuso
Schema de despesa (`src/lib/schemas.ts`), mutação tRPC de criar despesa, `Drawer`,
`CategorySelector`, ícones de `category-icon.tsx`, "Quem é você?" (`active-user-modal.tsx`),
textos novos em `messages/pt-BR.json` e `messages/en-US.json` (chaves novas, sem mexer nas antigas).

---

## Erros e bordas
- Porcentagem que não fecha 100% no grupo: não salva, rodapé em vermelho dizendo quanto falta.
- Participante removido de um grupo em porcentagem: o formulário pede para refechar 100%.
- Valor com vírgula (pt-BR): `12,50` aceito.
- Falha de rede ao salvar a despesa: mantém o que foi digitado e mostra o erro (sem perder dado).

## Testes
- **Unitário:** linha do registrinho (antes × depois); conversão padrão do grupo → opções da
  despesa (igual, 25/75, partes 1:3).
- **e2e (360 px):** criar grupo 25/75 → despesa rápida só com descrição e valor → salva 25/75;
  trocar pagador num atalho; "Mais opções" com porcentagem diferente; mudar o padrão do grupo →
  linha aparece na Atividade; porcentagem 90% bloqueia.
- **Auditoria visual** (`scripts/auditoria-mobile.mjs`) das telas novas a 320 e 360 px, com print.
- `npm run check-types`, `lint`, `test` e os e2e existentes verdes.

## Entrega
Dois PRs, nesta ordem: **A** (padrões do grupo) e **B** (despesa em uma tela).
**Pré-requisito do PR A** (tarefa do Lucas): banco de preview separado — ver `../HANDOFF.md`.

## Changelog
- **2026-10-13 — criação.** Partes A e B aprovadas em conversa; substitui o plano
  `plans/2026-10-13-despesa-em-uma-tela.md`, escrito antes dos prints do Splitwise.
- **2026-10-13 — parte A implementada** (plano `plans/2026-10-13-parte-a-padroes-do-grupo.md`).
  Escolhas do executor fora do texto da spec: trocar o modo já preenche divisão igual
  (33,33/33,33/33,34 ou 1 parte); quem está com 0% fica fora da despesa nova; a caixa "Salvar como
  padrão" some na divisão por valor ou com parte do grupo desmarcada; renomear participante não entra
  no registrinho.
