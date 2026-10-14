# Handoff — o que está pendente agora

> **Estado puro.** Item resolvido **sai** (vai para o changelog do arquivo que mudou).

## Onde estamos (14/10/2026)

**No ar** (`spliit-peixe.vercel.app`): partes A e B, a mãozinha no desktop, a **tela única**
(números pt-BR, divisão que não fecha não salva, "Quem é você neste grupo?") e o **parcelado**
(PRs #8 e #9, spec `specs/2026-10-13-tela-unica-e-parcelado.md` inteira). Usando, o Lucas achou
dois defeitos de layout no celular — são o próximo trabalho.

## Pendente, por prioridade

| # | O quê | Dono | Trava |
|---|---|---|---|
| 1 | **Layout no celular (print do Lucas, 14/10, ~330 px de largura, grupo "Teste" sem despesas):** (a) *"o quadro de despesas está com overflow"* — o card "Despesas" passa da borda direita da tela; (b) *"o botão flutuante de adicionar despesas está em cima do footer, ficando em cima do texto"* — o "+ Adicionar despesa" (`src/components/add-expense-fab.tsx`, `fixed bottom-4`) cobre o "Feito em Montréal… Desenvolvido por…". Caminho provável para (b): espaço no fim da página do tamanho do botão. Reproduzir antes no Chromium e **olhar o print de `/groups/<id>/expenses`**, vazio e com despesas (`APRENDIZADOS.md` #24) | Claude | — |
| 2 | **Parte C — foto da despesa:** brainstorming e spec (Blob privado já criado, ADR-007) | Claude + Lucas | — |
| 3 | **Pequenos das revisões** (não bloqueiam): editar o valor de despesa antiga em outra moeda mantém a conversão velha; erro de campo dentro de "Mais opções" fechado fica invisível; rodapé "valor excedido" aparece junto do "use vírgula"; remover quem é "você" deixa o aparelho sem ninguém; total negativo no parcelado mostra a mensagem de "pelo menos um centavo" | Claude | — |
| 4 | Remote do original para o fork vivo: `git remote add upstream https://github.com/spliit-app/spliit` `[conferir se o proxy da sessão deixa buscar]` | Claude | — |

## Para a próxima sessão não pagar de novo

- Subir o ambiente: `../CLAUDE.md` § Rodando na nuvem; armadilhas em `APRENDIZADOS.md`
  (#9: e2e só contra `next build && next start`, com `CI=1`; #10: parar o servidor pelo PID do
  `next-server`, num comando separado).
- Ritmo que funcionou: brainstorming → spec → writing-plans → executing-plans (nativo, TDD,
  ledger em `.superpowers/sdd/<plano>/progress.md`) → revisor independente (Agent, modelo opus)
  → corrigir Critical/Important com teste que falha antes → PR.
- O formulário de despesa é o `src/app/groups/[groupId]/expenses/expense-form.tsx` (do
  Spliit, reorganizado na tela única); os helpers dos e2e estão em `e2e/app.ts`.
- Auditoria mobile pronta: `node scripts/auditoria-mobile.mjs <pasta>` — e olhar **todos** os prints, não só os da tela mexida.
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
- **2026-10-14 — tela única e parcelado no ar.** Saíram os dois "mergear PR" (#8, #9); entrou o layout no celular que o Lucas achou usando; pequenos das duas revisões juntos.
