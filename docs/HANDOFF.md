# Handoff — o que está pendente agora

> **Estado puro.** Item resolvido **sai** (vai para o changelog do arquivo que mudou).

## Onde estamos (13/10/2026)

Kickoff e brainstorming feitos. As partes **A** (padrões do grupo) e **B** (despesa em uma tela)
foram desenhadas com o Lucas e a spec foi aprovada (merge do PR #3):
`specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md`. **Nenhum código de produto mudou.**
Infra pronta: banco de preview próprio (ADR-008) e Vercel Blob privado (ADR-007).
O app no ar é o Spliit original de 24/09, sem login.

## Pendente, por prioridade

| # | O quê | Dono | Trava |
|---|---|---|---|
| 1 | **Plano de implementação da parte A** (skill writing-plans), depois o código | Claude | — |
| 2 | Remote do original para o fork vivo: `git remote add upstream https://github.com/spliit-app/spliit` `[conferir se o proxy da sessão deixa buscar]` | Claude | — |

## Para a próxima sessão não pagar de novo

- Subir o ambiente: `../CLAUDE.md` § Rodando na nuvem; armadilhas em `APRENDIZADOS.md`.
- Auditoria mobile pronta: `node scripts/auditoria-mobile.mjs <pasta>`.
- O que o Spliit já tem antes de construir: tabela em `README.md`.
- Regras de classificação e o modelo 75/25 da casa: repo `L-Peixe/finance`.
- Os prints do Splitwise do Lucas estão descritos na spec (§ Parte B); as imagens não estão no
  repo (são fotos pessoais).

## Infra (estado)

- **Neon** projeto `neon-spliit-peixe` (`winter-truth-38045534`): `main` = produção
  (`ep-old-rain-…`); `preview` = cópia para os PRs (`br-twilight-shadow-b6o8vrai`, `ep-curly-lake-…`).
  Variáveis do banco de *Preview* na Vercel já apontam para a `preview` (Lucas, 13/10).
- **Vercel Blob** `spliit-peixe-fotos` (`store_isHQzNxWqFLtBIJD`), **privado**, região `gru1`,
  ligado a production/preview/development → `BLOB_READ_WRITE_TOKEN`. Preview e produção
  dividem o mesmo store: foto de teste vai num prefixo próprio.
- **Permissões da sessão:** o modo automático bloqueou criar ramificação no Neon por API
  ("recurso compartilhado") e listar as variáveis da Vercel ("credencial"). Para o Claude
  resetar a `preview` sozinho, a ação precisa do OK do Lucas na hora ou de regra de permissão.

## Changelog
- **2026-10-13 — criação.** Pendências do kickoff.
- **2026-10-13 — spec A/B.** Saiu "aprovar o plano" (virou spec), "prints do Splitwise" (recebidos),
  "settings.json" (o Lucas instalou os plugins) e "moeda na Vercel" (a moeda fica no grupo,
  ADR-006). Entraram o banco de preview (ramificação fixa + chave do Neon, ADR-008) e o Blob.
- **2026-10-13 — infra.** Saíram "aprovar a spec" (mergeada), "banco de preview" (feito),
  "criar o Blob" (feito, privado por escolha do Lucas) e "liberar hosts da NFC-e/CNPJ" (respondem).
  Remote do upstream virou item 2.
