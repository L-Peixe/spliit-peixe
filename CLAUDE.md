@AGENTS.md

# Operação
Este projeto segue o repo `L-Peixe/freelas` (CLAUDE.md global + BLUEPRINT-OPERACAO-FREELAS.md).
Se ele não estiver nesta sessão, adicione-o (`add_repo` L-Peixe/freelas), clone e leia os dois
arquivos **antes da primeira ação**.

> **Não é freela de cliente — é produto pessoal do Lucas.** Do blueprint vale o modo de trabalhar
> (§0, §1, §1.1 nuvem, §2 git/PR, §9 navegador, §17 documentação). A arquitetura de site
> Payload (§3–§7, §10–§13) **não se aplica** aqui.

# spliit-peixe
Fork do [Spliit](https://github.com/spliit-app/spliit) (MIT) para virar o **Splitwise do Lucas**:
registrar e dividir despesas com **praticidade máxima, celular primeiro**.

**Antes de agir, leia:** `docs/README.md` (o produto e onde mora cada coisa) →
`docs/HANDOFF.md` (o que está pendente agora). Decisões e o porquê: `docs/DECISOES.md`.

## Regras do projeto
- **Praticidade é o critério de desempate.** Entre duas soluções, a que registra a despesa com
  menos toques ganha. Funcionalidade que acrescenta campo obrigatório precisa justificar.
- **Mobile primeiro, e provado.** Toda tela tocada passa a 320 e 360 px no Chromium headless
  (`node scripts/auditoria-mobile.mjs <pasta>`), olhando o print — não só medindo overflow.
- **Desktop: todo clicável mostra a mãozinha** (`cursor: pointer`). Regra global em
  `src/app/globals.css`; `e2e/cursor.spec.ts` cobra. Div com `onClick` leva `cursor-pointer`.
- **Fork vivo** (ADR-003): código novo em **arquivos próprios**; no que já existe, diff pequeno.
  O `README.md` da raiz é do original — **não editar**. A doc do projeto mora em `docs/` e aqui.
- **Só despesas por enquanto** (ADR-005). Receita/income está no roadmap, não no código.
- **pt-BR e R$ são o padrão** do produto; o original nasce em inglês e USD.
- **Repo público:** nunca commitar dado financeiro real, nome completo de terceiro, CPF/CNPJ de
  pessoa, token ou `.env`. Exemplos e testes usam dado inventado.
- **Custo zero por padrão.** IA paga (OpenAI) e API paga só com pedido do Lucas pelo nome.
- **Antes de criar algo, procure:** no código do Spliit (ele já tem muita coisa — ver a tabela em
  `docs/README.md`) e no repo `L-Peixe/finance` (regras de classificação e o modelo 75/25 da casa).

## Rodando na nuvem (resumo — detalhes em `docs/APRENDIZADOS.md`)
```bash
(dockerd > /tmp/dockerd.log 2>&1 &)            # Docker vem desligado
docker run -d --name pg -e POSTGRES_PASSWORD=1234 -p 5432:5432 mirror.gcr.io/library/postgres:17
cp .env.example .env && npm ci                 # npm, não pnpm; o postinstall migra o banco
npx next dev -p 3000
```

## Deploy
Vercel, projeto `spliit-peixe` na conta **gioguanaes**, com a integração do GitHub ligada:
push na `main` vai para produção (`spliit-peixe.vercel.app`) e todo PR ganha preview.
`vercel.json` pula o build quando o commit só muda `*.md`/`docs/` (blueprint §2.1a).
