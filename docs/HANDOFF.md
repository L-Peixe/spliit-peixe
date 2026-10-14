# Handoff — o que está pendente agora

> **Estado puro.** Item resolvido **sai** (vai para o changelog do arquivo que mudou).

## Onde estamos (14/10/2026)

**No ar** (`spliit-peixe.vercel.app`): partes A e B e a mãozinha no desktop. **Em dois PRs
encadeados** (spec `specs/2026-10-13-tela-unica-e-parcelado.md`): o PR 1 (branch `tela-unica`) —
números pt-BR, divisão que não fecha não salva, "Quem é você neste grupo?" e a tela única — e o
PR 2 (branch `parcelado`, montado em cima do 1, com migration aditiva) — parcelado.

## Pendente, por prioridade

| # | O quê | Dono | Trava |
|---|---|---|---|
| 1 | **Revisar e mergear o PR da tela única** (testar no preview pelo celular) | Lucas | O PR 2 |
| 2 | **Revisar e mergear o PR do parcelado** depois do 1 (a base dele muda para `main` sozinha quando o 1 entrar) | Lucas | PR 1 |
| 3 | **Parte C — foto da despesa:** brainstorming e spec (Blob privado já criado, ADR-007) | Claude + Lucas | Parcelado no ar |
| 4 | **Pequenos da revisão do PR 1** (não bloqueiam): editar o valor de despesa antiga em outra moeda mantém a conversão velha; erro de campo dentro de "Mais opções" fechado fica invisível; rodapé "valor excedido" aparece junto do "use vírgula"; remover quem é "você" deixa o aparelho sem ninguém | Claude | — |
| 5 | Remote do original para o fork vivo: `git remote add upstream https://github.com/spliit-app/spliit` `[conferir se o proxy da sessão deixa buscar]` | Claude | — |

## Para a próxima sessão não pagar de novo

- Subir o ambiente: `../CLAUDE.md` § Rodando na nuvem; armadilhas em `APRENDIZADOS.md`
  (#9: e2e só contra `next build && next start`, com `CI=1`; #10: parar o servidor pelo PID do
  `next-server`, num comando separado).
- Ritmo que funcionou: brainstorming → spec → writing-plans → executing-plans (nativo, TDD,
  ledger em `.superpowers/sdd/<plano>/progress.md`) → revisor independente (Agent, modelo opus)
  → corrigir Critical/Important com teste que falha antes → PR.
- O formulário de despesa é o `src/app/groups/[groupId]/expenses/expense-form.tsx` (~1.400
  linhas, do Spliit); os helpers dos e2e estão em `e2e/app.ts`.
- Auditoria mobile pronta: `node scripts/auditoria-mobile.mjs <pasta>`.
- O que o Spliit já tem antes de construir: tabela em `README.md`.
- Regras de classificação e o modelo 75/25 da casa: repo `L-Peixe/finance`.

## Infra (estado)

- **Neon** projeto `neon-spliit-peixe` (`winter-truth-38045534`): `main` = produção
  (`ep-old-rain-…`); `preview` = cópia para os PRs (`br-twilight-shadow-b6o8vrai`, `ep-curly-lake-…`).
  Variáveis do banco de *Preview* na Vercel já apontam para a `preview` (Lucas, 13/10).
- **Vercel Blob** `spliit-peixe-fotos` (`store_isHQzNxWqFLtBIJD`), **privado**, região `gru1`,
  ligado a production/preview/development → `BLOB_READ_WRITE_TOKEN`. Preview e produção
  dividem o mesmo store: foto de teste vai num prefixo próprio.
- **Autonomia do Claude** (`.claude/settings.json`, autorizado pelo Lucas): `scripts/neon-preview.sh
  status|reset` (reset = a `preview` volta a ser cópia da produção) e listar as variáveis da
  Vercel sem decrypt (`filter_project_envs`). Criar ramificação nova ou mexer na `main` continua
  pedindo OK.

## Changelog
- **2026-10-13 — criação.** Pendências do kickoff.
- **2026-10-13 — spec A/B.** Saiu "aprovar o plano" (virou spec), "prints do Splitwise" (recebidos),
  "settings.json" (o Lucas instalou os plugins) e "moeda na Vercel" (a moeda fica no grupo,
  ADR-006). Entraram o banco de preview (ramificação fixa + chave do Neon, ADR-008) e o Blob.
- **2026-10-13 — infra.** Saíram "aprovar a spec" (mergeada), "banco de preview" (feito),
  "criar o Blob" (feito, privado por escolha do Lucas) e "liberar hosts da NFC-e/CNPJ" (respondem).
  Remote do upstream virou item 2.
- **2026-10-13 — variáveis.** Lucas recriou as variáveis do banco de produção (tinham ficado só em Preview na troca); conferido pela listagem da Vercel.
- **2026-10-13 — parte A.** Saiu "plano da parte A"; entrou revisar o PR de A e a parte B.
- **2026-10-13 — A no ar.** PRs #4 e #5 mergeados; entrou o PR da mãozinha (regra do Lucas para desktop).
- **2026-10-13 — parte B.** Mãozinha mergeada (#6). Saiu "plano e código da parte B" (PR aberto); entrou a parte C.
- **2026-10-13 — tela única.** B mergeada (#7). Entraram a spec da tela única + parcelado e a revisão dela; saiu "revisar PR B".
- **2026-10-14 — PR 1 da tela única.** Saíram "revisar a spec" (aprovada) e o plano/código do PR 1 (PR aberto); entrou revisar o PR; parcelado virou item próprio.
- **2026-10-14 — parcelado.** O plano/código do PR 2 saiu (PR aberto); entrou revisar o PR 2.
