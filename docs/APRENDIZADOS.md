# Aprendizados

> **Registro deduplicado:** uma linha por padrão, não por ocorrência. Viu de novo? Acrescente
> a data em "Visto em". A causa morreu? Sai daqui e vira linha no changelog.
> Armadilha que vale para todos os projetos sobe para o blueprint do `L-Peixe/freelas`.

## Ambiente (nuvem)

| # | Sintoma | Causa | Solução | Visto em |
|---|---|---|---|---|
| 1 | `docker run postgres:17` falha com `429 Too Many Requests` | Limite anônimo do Docker Hub, compartilhado pelos containers da nuvem | Usar o espelho do Google: `mirror.gcr.io/library/postgres:17` | 13/10/2026 |
| 2 | Playwright: `Executable doesn't exist at .../chromium_headless_shell-1243` | O repo fixa um Playwright mais novo que o Chromium do container (1194) | `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`. Nunca `playwright install` | 13/10/2026 |
| 3 | `npm ci` cheio de `EBADENGINE` | O container tem Node 22; o `package.json` pede 24/26 (a Vercel usa 24) | Só aviso — instala e roda. O `postinstall` faz `prisma migrate deploy`: **suba o Postgres antes** | 13/10/2026 |
| 4 | `next dev` cria `AGENTS.md` e `CLAUDE.md` no repo | O Next 16 escreve um bloco de regras para agentes | Os dois estão commitados; o `CLAUDE.md` do projeto começa com `@AGENTS.md`, e o Next só atualiza o bloco do `AGENTS.md` | 13/10/2026 |
| 5 | `curl` para SEFAZ ou BrasilAPI: `connect_rejected` | Política de rede do ambiente (blueprint §1.1) | Lucas libera os domínios em Network access do ambiente | 13/10/2026 |
| 6 | Escrever `.claude/settings.json` é negado em modo automático ("Self-Modification") | O classificador bloqueia o agente mudar a própria configuração | Com pedido explícito do Lucas na conversa, criar pelo Bash passou (13/10, regra do Neon/Vercel). O arquivo já existe no repo: acrescentar, não recriar | 13/10/2026 (2×) |
| 7 | PR aberto mexeria na produção | Variáveis do banco na Vercel marcadas para *production* **e** *preview*, e o `postinstall` roda `prisma migrate deploy` no build | Preview com banco próprio (ADR-008). Conferir os alvos das variáveis com `filter_project_envs` (só nomes) antes de todo PR com migration | 13/10/2026 |
| 8 | `WebFetch` em `vercel.com` falha com `ENOTFOUND` | Rede do ambiente | Doc da Vercel pelo conector: `search_vercel_documentation` | 13/10/2026 |
| 9 | e2e: 32 de 52 falham por timeout | Rodar a suíte contra `next dev` com 4 workers (cada rota compila na hora) | Rodar contra `next build && next start` com `CI=1` (2 workers, 2 retries), como no CI. Chromium do container via `playwright.local.config.ts` (gitignored, só `launchOptions.executablePath`) | 13/10/2026 |
| 10 | `pkill -f "next ..."` derruba o próprio comando (exit 144) | O padrão casa com a linha de comando do shell que roda o `pkill` | Parar o servidor num comando separado, sem o padrão no mesmo comando que sobe outro |  13/10/2026 |
| 11 | e2e instável: participante "na posição 2" muda | `getGroup` não ordena os participantes | Achar participante pelo nome, nunca pelo índice `participants.N` | 13/10/2026 |
| 12 | Neon API: `400 org_id is required` ao listar projetos | A chave é de organização | `GET /api/v2/users/me/organizations` dá o `org_id`; depois `projects?org_id=…`. Reset da `preview`: `POST …/branches/<id>/reset_to_parent` (já em `scripts/neon-preview.sh`). A doc em `neon.com` não abre daqui (`ENOTFOUND`) | 13/10/2026 |
| 13 | Modo automático nega criar ramificação no Neon ("Modify Shared Resources") e listar variáveis da Vercel ("Credential Materialization") | Ações em recurso compartilhado/credencial pedem OK | Regra em `.claude/settings.json` + script estreito (`neon-preview.sh` só toca a `preview`). Ações fora dele ainda pedem o Lucas | 13/10/2026 |
| 14 | Depois de "trocar as variáveis de Preview", a Production ficou sem `POSTGRES_PRISMA_URL` | O Lucas **editou** a variável existente para só Preview em vez de criar uma nova | Pedir **Add New** só para Preview, sem editar a existente; conferir com `filter_project_envs` (nomes e alvos). `src/lib/env.ts` exige as duas: o próximo build de produção falharia | 13/10/2026 |
| 15 | Edição por `python3` com `s.replace(...)` "deu certo" e o teste nem mudou | O `prettier` já tinha reformatado o arquivo e o trecho antigo não existia mais; `replace` não acha e não reclama | Sempre `assert old in s` antes do `replace`. E em string Python sem `r''`, `\u0300` vira o caractere: escrever `\\u` | 13/10/2026 |
| 16 | Na tela em inglês aparecia "split igualmente" | Função pura devolvia texto pt-BR fixo | Texto visível sempre por `messages/*.json`; função pura recebe as palavras já traduzidas. Os e2e rodam em en-US e pegam isso | 13/10/2026 |
| 17 | "Tente de novo" que nunca dá certo ao salvar | O cliente aceitava o que o schema do servidor recusa (descrição de 1 letra, soma arredondada diferente, divisão por valor de outro valor) | Validar no cliente com **as mesmas regras e o mesmo arredondamento** do `src/lib/schemas.ts`; erro do servidor não pode virar mensagem genérica. Achado pela revisão independente, não pelos testes | 13/10/2026 |
| 18 | Data salva um dia antes em fuso UTC+12 | `new Date(d + 'T12:00')` + coluna `@db.Date` (guarda só a data UTC) | `new Date('YYYY-MM-DD')` (meia-noite UTC), como o formulário do Spliit faz | 13/10/2026 |
| 19 | `docker` não responde depois que o container reiniciou; `dockerd` morre com `timeout waiting for containerd` | Primeira subida do containerd lenta | Rodar `dockerd` de novo e esperar `docker info`; `docker start pg` reaproveita o banco | 13/10/2026 |

## Auditoria mobile — a receita

`node scripts/auditoria-mobile.mjs <pasta>` com o dev server de pé. Playwright com `locale: 'pt-BR'`, `isMobile: true`,
viewport 320 e 360 × 760, cookie `NEXT_LOCALE=pt-BR`. Em cada tela: `scrollWidth` contra
`clientWidth`, elementos com `getBoundingClientRect()` fora da tela e sem ancestral com
`overflow-x` de rolagem, alvos de toque < 32 px, e **print de página inteira, olhado**.
Os seletores do grupo e da despesa estão em `e2e/app.ts`; o "pago por" é o
`getByTestId('paid-by')` e é obrigatório para salvar.

## Changelog
- **2026-10-13 — partes A/B e tela única.** Entraram 12 a 19 (Neon, permissões, variáveis da Vercel, edição por script, i18n, validação cliente×servidor, data, Docker); #6 atualizado (com pedido do Lucas, passou).
