# Decisões (ADR)

> **Registro imutável.** ADR nunca é editado; decisão nova **substitui** a antiga, nomeando-a,
> e a antiga ganha só o campo `Status: SUBSTITUÍDA pela ADR-0NN (data)`.

---

## ADR-001 — Para quem é: o Lucas, a Gio e os amigos
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas ("Eu, Gio e amigos")

Uma instância própria, usada por quem o Lucas convida. Não é produto aberto ao público por
enquanto.

**Por quê:** menos a construir (planos, suporte, abuso, LGPD de produto) e o foco fica na
praticidade do uso real. **Descartado:** cadastro aberto desde já; "construir pensando em abrir".
Abrir ao público pode voltar como ADR nova.

## ADR-002 — Login com Google obrigatório; o link do grupo vira convite
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas ("Google obrigatório")

Grupo só abre para membro. O link de hoje deixa de dar acesso direto: vira convite, a pessoa
entra com o Google e passa a ser membro (e escolhe qual participante ela é).

**Por quê:** hoje qualquer pessoa com o link vê e edita tudo, sem conta — inaceitável para dado
financeiro. Login social porque é um botão só ("a pessoa não tem que criar conta nenhuma").
Código por e-mail fica para depois. **Descartado:** Google opcional com o link ainda aberto.

## ADR-003 — Fork vivo: continuar trazendo as melhorias do Spliit original
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas ("Sim, enquanto der")

O original (`spliit-app/spliit`) recebe correções toda semana. O fork as traz de tempos em tempos.
Para isso: código novo em arquivos próprios; no que já existe, diff pequeno; `README.md` da
raiz intocado; doc do projeto em `docs/` e `CLAUDE.md`.

**Custo aceito:** não refazer telas antigas por dentro — telas novas convivem com as antigas.
**Sinal para rever:** quando um merge do original custar mais do que as melhorias que traz
(o login da ADR-002 é o candidato). **Descartado:** virar projeto próprio já (nome, pt-BR
primeiro, liberdade total).

## ADR-004 — Primeiro passo: adicionar despesa em uma tela
**Data:** 13/10/2026 · **Status:** SUBSTITUÍDA pela ADR-006 (13/10/2026) · **Decidiu:** Lucas ("Adicionar despesa em 1 tela")

Antes de login, nota fiscal ou parcelado, a tela de adicionar despesa no estilo Splitwise.

**Por quê:** é a dor do dia a dia. A auditoria de 13/10 mostrou que o celular não estoura a
largura — o gargalo é o **fluxo**: nove campos e dois cartões, valor no meio da página, "pago
por" sem padrão. **Descartado como 1º passo:** login, teste da NFC-e, parcelado (seguem no
roadmap). Plano: `plans/2026-10-13-despesa-em-uma-tela.md`.

## ADR-005 — Só despesas, por enquanto
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas

*"Eu acho que por enquanto vamos focar só nas despesas, tá? Pode ser um plano pra depois."*
Receita (income/outcome) não entra no código; fica no roadmap.

## ADR-006 — A configuração mora na criação do grupo; adicionar despesa é seco
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas · Substitui a ADR-004

*"O máximo que der pra padronizar na hora da criação do grupo é o que vai ser o nosso vencedor
da praticidade."* *"O que não pode ter muita coisa é na hora de adicionar a despesa... a despesa
foi isso, o valor foi esse, enviar, acabou."* O padrão vem pré-selecionado e se muda num toque,
só naquela despesa.

- Divisão padrão escolhida **por grupo**, na criação: igualmente, por porcentagem ou por partes
  ("valor a mais" era porcentagem). Guardada no servidor, não no aparelho.
- **Sem tipo "casal" e sem padrão embutido.** *"Já nascer 75/25 não é generalista, é específico
  pro meu caso"* — o Lucas tem um grupo 50/50 e outro 25/75.
- Qualquer membro muda o padrão, *"mas toda vez... ter um registrinho"* de quem mudou e o quê,
  fácil de achar (aba Atividade).
- Moeda é do grupo; ao criar, vem pela língua do aparelho. *"Não quero que seja um env."*
- Ordem: **A** padrões do grupo → **B** despesa em uma tela → **C** foto, um PR cada.
- Tela rápida: último grupo usado já marcado; salvar no ✓ do topo e no "Enviar" do teclado.

**Por quê:** os prints do Splitwise mostram que a praticidade vem de padrões bons, não de menos
funções. Spec: `specs/2026-10-13-padroes-do-grupo-e-despesa-rapida.md`.

## ADR-007 — Foto da despesa já na primeira versão, no Vercel Blob
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas

A foto é processada **na qualidade original** (para ler nota fiscal ou código de barras, que
perdem nitidez em ângulo) e **guardada em WebP**, para ocupar pouco espaço. Armazenamento:
Vercel Blob (o Claude cria, com autorização, quando a spec da parte C for aprovada).
**Descartado:** adiar a foto para depois da tela rápida.

## ADR-008 — Banco de preview: ramificação fixa do Neon, gerida pelo Claude
**Data:** 13/10/2026 · **Status:** vigente · **Decidiu:** Lucas ("Fixa + chave do Neon para mim")

O preview da Vercel usava o banco de produção, e o build aplica migrations — um PR mexia na
produção antes do merge. Agora: uma ramificação `preview` no Neon, usada por todos os PRs. O
Lucas configura **uma vez** (chave da API do Neon como credencial do ambiente e as variáveis de
Preview na Vercel); o Claude cria e reseta a ramificação a partir da produção quando precisar.
Os testes do Claude continuam no Postgres em Docker do container — o preview é para o Lucas
ver no celular. **Descartado:** ramificação automática por PR (não confirmado no plano grátis);
ramificação fixa sem chave (reset dependeria do Lucas); desligar o preview.
