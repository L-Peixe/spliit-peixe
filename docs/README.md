# spliit-peixe — o produto e onde mora cada coisa

> **Estado.** Reescrito no lugar; a história fica no changelog do fim.

## A dor que o produto resolve

Na correria do dia a dia a despesa não é registrada. No fim do mês sobram uma fatura e um
extrato cheios de Pix e compras de que ninguém lembra a origem, e registrar tudo de uma vez
custa horas e não dá controle real dos gastos.

**Por isso o critério de tudo é praticidade**: quanto menos toques para registrar uma despesa
no celular, na hora em que ela acontece, melhor. Desktop importa; **mobile é obrigatório**.

## O que o produto quer ser

Um Splitwise brasileiro e pessoal (do Lucas, da Gio e dos amigos — ADR-001):

1. **Adicionar despesa em uma tela**: descrição e valor, com "pago por você, dividido
   igualmente" já preenchido e trocável num toque.
2. **Login com o Google**, obrigatório: grupo só para membros, o link vira convite.
3. **Categoria sozinha**: "Uber" vira transporte, "McDonald's" vira restaurante, "Netflix"
   vira assinatura. Depois disso, um painel do mês por categoria.
4. **Nota fiscal pelo QR code** (NFC-e): loja, data, hora, itens, forma de pagamento e valor
   sem digitar nada.
5. **Pix sem mistério**: identificar para quem e para quê foi um Pix sem depender da memória.
6. **Parcelado** que lança uma parcela por mês sozinho, e **recorrente** (assinaturas).
7. **Padrões no grupo**: cada grupo nasce com a sua divisão (o Lucas tem um 50/50 e um 25/75),
   e a despesa já vem com ela marcada.

Horizonte, ordem e o que destrava cada item: `roadmap.md`.

## O que o Spliit já tem — não reconstruir

Levantado no código em 13/10/2026 (`registro/2026-10-13-levantamento-inicial.md`).

| Precisamos de | No Spliit hoje | Falta |
|---|---|---|
| Grupos e saldos | ✅ grupo por link, saldos, sugestão de acerto, "quem é você" | Conta de usuário (é por aparelho, `localStorage`) |
| Divisão | ✅ igualmente, por partes, por %, por valor | **Por ajuste**. Divisão padrão do grupo: `src/lib/group-defaults.ts` e `src/components/group-default-split.tsx` (parte A). Despesa em uma tela: `src/app/groups/[groupId]/expenses/quick/`, `src/lib/quick-expense.ts` e o botão `src/components/add-expense-fab.tsx` (parte B) — vai virar a tela única, ver `specs/2026-10-13-tela-unica-e-parcelado.md` |
| Recorrente | ✅ diária, semanal, mensal — criada quando alguém abre o grupo | Anual, data de fim, aviso |
| Parcelado | ❌ | Tudo |
| Categorias | ✅ 44 fixas, em inglês na origem; sugestão por IA (OpenAI, opcional) | Categorias brasileiras; regra por palavra-chave sem IA; aprender com a correção |
| Painel | ✅ gastos mensais por categoria, por grupo | Painel pessoal somando todos os grupos |
| Recibo | ✅ foto do recibo lida por IA (OpenAI + S3, opcionais) | NFC-e pelo QR (dado oficial, sem IA) |
| QR code | ✅ leitor de câmera (`html5-qrcode`), hoje só para entrar em grupo | Ler NFC-e e Pix |
| Outros | ✅ PWA, pt-BR, várias moedas, anexos, atividade, exportar CSV | Padrão R$ e data dd/mm |

**Também já existe, fora deste repo:** `L-Peixe/finance` tem o modelo 75/25 da casa
(Lucas × Gio), as regras de classificação por estabelecimento e por contraparte de Pix
(`rules/comerciantes.yml`, `rules/contrapartes.yml`) e um parser dos PDFs do Nubank.
São a semente das categorias automáticas e da conciliação com o extrato.

## Onde mora cada coisa

| Arquivo | Semântica | Para quê |
|---|---|---|
| `../CLAUDE.md` | estado, curto | Regras antes de agir |
| `HANDOFF.md` | estado | O que está pendente **agora**, com dono |
| `roadmap.md` | horizonte | O que o produto quer ser, sem data; o que travou |
| `DECISOES.md` | registro imutável | ADRs: o que foi decidido e por quê |
| `specs/<data>-<nome>.md` | desenho aprovado | O que vai ser construído e por quê (skill brainstorming) |
| `plans/<data>-<nome>.md` | plano vivo | Passo a passo de implementação de uma spec; executou, morre |
| `registro/<data>-<nome>.md` | registro | Levantamentos e pesquisas datados |
| `APRENDIZADOS.md` | registro deduplicado | Armadilhas de ambiente e de código |
| `../README.md` | **do Spliit original** | Não editar (ADR-003) |

## Changelog

- **2026-10-13 — criação.** Visão do produto a partir da conversa de kickoff com o Lucas e
  tabela do que o Spliit já tem, levantada no código.
- **2026-10-13 — specs.** Pasta `specs/` (desenho aprovado) separada de `plans/` (passo a passo);
  item 7 da visão corrigido: padrão por grupo, sem padrão de casal embutido.
