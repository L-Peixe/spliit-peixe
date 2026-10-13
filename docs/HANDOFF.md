# Handoff — o que está pendente agora

> **Estado puro.** Item resolvido **sai** (vai para o changelog do arquivo que mudou).

## Onde estamos (13/10/2026)

Kickoff e brainstorming feitos. As partes **A** (padrões do grupo) e **B** (despesa em uma tela)
foram desenhadas com o Lucas, com base nos prints do Splitwise dele, e estão na spec
`specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md`. **Nenhum código de produto mudou.**
O app no ar é o Spliit original de 24/09, sem login.

## Pendente, por prioridade

| # | O quê | Dono | Trava |
|---|---|---|---|
| 1 | **Revisar e aprovar a spec** de A e B | Lucas | O plano de implementação (skill writing-plans) e o código |
| 2 | **Banco de preview separado da produção** — hoje as variáveis do banco na Vercel valem para *production* e *preview*, e o `postinstall` roda `prisma migrate deploy` no build: um PR com migration **mexe na produção antes do merge**, e teste feito no preview grava no banco real. Caminho em decisão com o Lucas | Lucas + Claude | Abrir o PR da parte A |
| 3 | Criar o Vercel Blob (autorizado) quando a spec da parte C for aprovada | Claude | Parte C |
| 4 | Liberar em Network access do ambiente: `www.nfce.fazenda.sp.gov.br`, `brasilapi.com.br` | Lucas | Teste da NFC-e e do CNPJ (roadmap 7 e 8) |
| 5 | Remote do original para o fork vivo: `git remote add upstream https://github.com/spliit-app/spliit` `[conferir se o proxy da sessão deixa buscar]` | Claude | — |

## Para a próxima sessão não pagar de novo

- Subir o ambiente: `../CLAUDE.md` § Rodando na nuvem; armadilhas em `APRENDIZADOS.md`.
- Auditoria mobile pronta: `node scripts/auditoria-mobile.mjs <pasta>`.
- O que o Spliit já tem antes de construir: tabela em `README.md`.
- Regras de classificação e o modelo 75/25 da casa: repo `L-Peixe/finance`.
- Os prints do Splitwise do Lucas estão descritos na spec (§ Parte B); as imagens não estão no
  repo (são fotos pessoais).

## Changelog
- **2026-10-13 — criação.** Pendências do kickoff.
- **2026-10-13 — spec A/B.** Saiu "aprovar o plano" (virou spec), "prints do Splitwise" (recebidos),
  "settings.json" (o Lucas instalou os plugins) e "moeda na Vercel" (a moeda fica no grupo,
  ADR-006). Entraram o banco de preview e o Blob.
