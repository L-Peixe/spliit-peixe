# Handoff — o que está pendente agora

> **Estado puro.** Item resolvido **sai** (vai para o changelog do arquivo que mudou).

## Onde estamos (13/10/2026)

Kickoff feito: a visão do produto, as cinco primeiras decisões (`DECISOES.md`), o horizonte
(`roadmap.md`) e o plano do 1º passo — **adicionar despesa em uma tela** — estão escritos.
**Nenhum código de produto mudou.** O app no ar é o Spliit original de 24/09, sem login.

## Pendente, por prioridade

| # | O quê | Dono | Trava |
|---|---|---|---|
| 1 | Revisar e **aprovar o plano** `plans/2026-10-13-despesa-em-uma-tela.md` (e as "decisões minhas" dele) e mergear o PR da doc | Lucas | O código do 1º passo |
| 2 | Mandar **prints do Splitwise** no celular: adicionar despesa, "pago por", "dividido", lista do grupo | Lucas | Fidelidade da tela nova |
| 3 | Criar `.claude/settings.json` neste repo com **ponytail**, **superpowers** (de onde vem a skill brainstorming) e os hooks da `documentar` — o modo automático me impediu de criar | Lucas | Usar as skills na próxima sessão |
| 4 | `DEFAULT_CURRENCY_CODE=BRL` nas variáveis da Vercel (projeto `spliit-peixe`, conta gioguanaes), ou me autorizar a fazer | Lucas | Grupo novo nascer em R$ |
| 5 | Implementar o plano do item 1 | Claude | Itens 1 e 2 |
| 6 | Liberar em Network access do ambiente: `nfce.fazenda.sp.gov.br`, `brasilapi.com.br` (e depois as outras SEFAZ) | Lucas | Teste da NFC-e e do CNPJ (roadmap 7 e 8) |
| 7 | Remote do original para o fork vivo: `git remote add upstream https://github.com/spliit-app/spliit` e trazer as novidades antes de cada plano grande `[conferir se o proxy da sessão deixa buscar]` | Claude | — |

## Para a próxima sessão não pagar de novo

- Subir o ambiente: `../CLAUDE.md` § Rodando na nuvem; armadilhas em `APRENDIZADOS.md`.
- Auditoria mobile pronta: `node scripts/auditoria-mobile.mjs <pasta>`.
- O que o Spliit já tem antes de construir: tabela em `README.md`.
- Regras de classificação e o modelo 75/25 da casa: repo `L-Peixe/finance`.

## Changelog
- **2026-10-13 — criação.** Pendências do kickoff.
