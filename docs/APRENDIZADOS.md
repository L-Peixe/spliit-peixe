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
| 6 | Escrever `.claude/settings.json` é negado em modo automático ("Self-Modification") | O classificador bloqueia o agente mudar a própria configuração | Pedir ao Lucas para aprovar ou criar o arquivo | 13/10/2026 |

## Auditoria mobile — a receita

`node scripts/auditoria-mobile.mjs <pasta>` com o dev server de pé. Playwright com `locale: 'pt-BR'`, `isMobile: true`,
viewport 320 e 360 × 760, cookie `NEXT_LOCALE=pt-BR`. Em cada tela: `scrollWidth` contra
`clientWidth`, elementos com `getBoundingClientRect()` fora da tela e sem ancestral com
`overflow-x` de rolagem, alvos de toque < 32 px, e **print de página inteira, olhado**.
Os seletores do grupo e da despesa estão em `e2e/app.ts`; o "pago por" é o
`getByTestId('paid-by')` e é obrigatório para salvar.
