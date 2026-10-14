# Roadmap — o horizonte

> **Horizonte, sem data.** Cada item responde *"o que o produto quer ser"*, não *"o que estamos
> fazendo"*. Item que vira trabalho **sai daqui** e vira plano em `plans/`; no lugar fica uma
> linha apontando. Plano executado vira código + changelog.
>
> 🔁 **Gatilho:** ao fechar qualquer plano, releia esta página e promova o próximo item.
>
> Ordem = prioridade de hoje (13/10/2026). Cada item diz o **sinal de largada**, não prazo.

## Em andamento

- **Foto da despesa (C)**, Vercel Blob privado, lê nota/código de barras no original e guarda
  WebP (ADR-007) — spec própria; vem depois do ajuste de layout no celular (`HANDOFF.md`).

## Próximos

### 1. Login com Google obrigatório (ADR-002)
Grupo só para membros; o link vira convite; a conta lembra "quem sou eu" em qualquer aparelho.
- Caminho provável: Auth.js (NextAuth v5) ou Better Auth com adapter Prisma — escolher no
  plano, conferindo a compatibilidade com o Next 16 do repo (`AGENTS.md`: a API mudou).
- Migração: grupos de hoje não têm dono. Quem abrir um grupo antigo logado vira membro e diz
  qual participante é; o acesso sem login acaba numa data combinada com o Lucas.
- Depende do Lucas: criar o cliente OAuth no Google Cloud (passo a passo no plano).
- **Largada:** as partes A e B no ar.

### 2. Categorias brasileiras e automáticas
- Trocar as 44 categorias do original (inglês) por uma lista brasileira curta (Mercado,
  Restaurante, Transporte, Assinaturas, Casa, Saúde…), mapeando as antigas.
- Classificar **sem IA** primeiro: palavra-chave na descrição (`uber` → Transporte). A semente
  é o `rules/comerciantes.yml` do `L-Peixe/finance`, só os padrões genéricos (nada pessoal: o
  repo é público).
- Aprender com a correção: trocou a categoria de "Padaria Real" uma vez, a próxima vem certa.
- A sugestão por IA que já existe fica como reserva opcional (custa — ADR de custo zero).
- **Largada:** junto ou logo depois do login (aprender por pessoa precisa de conta).

### 3. Painel do mês
Gasto por categoria somando **todos os grupos da pessoa** (a parte dela em cada despesa), mês
contra mês. O Spliit já tem o gráfico por grupo — reaproveitar.
- **Largada:** login + categorias.

### 4. Parcelado → em andamento (spec da tela única, ADR-011)

### 5. Recorrente / assinaturas — completar o que existe
Já há diária, semanal e mensal. Faltam **anual**, **data de fim** e deixar claro na lista o que
é recorrente. Hoje a próxima ocorrência só nasce quando alguém abre o grupo — conferir se isso
basta para o Lucas.

### 6. Casal e grupo
Ideia do Lucas, ainda sem forma: *"casais têm dinâmicas diferentes… fica como uma ideia"*.
A divisão padrão por grupo (ADR-006) já atende o caso real (um grupo 50/50, outro 25/75).
Falta, se fizer sentido um dia: divisão **por ajuste** e o que mais um casal fizer diferente
de amigos. **Não** existe padrão embutido de casal (correção do Lucas, 13/10).
- **Largada:** depois do login, com uma rodada de perguntas ao Lucas.

### 7. Nota fiscal pelo QR code (NFC-e)
Ler o QR do cupom e trazer loja, CNPJ, data, hora, itens, forma de pagamento e total.
- O QR traz uma URL do portal da SEFAZ do estado; a página é pública mas **muda por estado**.
  Ler no servidor (o navegador bloqueia por CORS), um adaptador por UF, começando por SP.
- Itens viram uma tabela nova ligada à despesa — base do "no que eu mais gasto no mercado".
- Riscos: layout que muda sem aviso, captcha, portal fora do ar, bloqueio de IP de fora do
  Brasil (a Vercel tem região em São Paulo, `gru1`). Fallback: digitar a chave de 44 dígitos.
- Pesquisa: `registro/2026-10-13-levantamento-inicial.md` §NFC-e.
- **Largada:** um **teste de viabilidade** (só SP, só leitura) assim que o Lucas liberar os
  domínios da SEFAZ na rede do ambiente — o container hoje recusa.

### 8. Pix sem mistério
Ideias, da mais barata à mais cara (detalhes no levantamento §Pix):
1. **Caixa de entrada**: registrar só o valor num toque, completar depois.
2. **Ler o QR do Pix / colar o copia-e-cola** antes de pagar: traz nome e cidade do recebedor
   e o valor; a despesa nasce e o código vai para a área de transferência para pagar no banco.
3. **CNPJ → ramo → categoria**: Pix para CNPJ diz o ramo da empresa (CNAE).
4. **Compartilhar o comprovante** do app do banco para o nosso (Android; no iPhone sem suporte
   confirmado — Atalhos como saída).
5. **Conciliação do mês**: importar o extrato e mostrar o que está no banco e não está no app
   (o parser do Nubank do `finance` é a semente).
- **Largada:** 1 e 2 cabem logo depois da despesa em uma tela; 5 depois do painel.

## Horizonte distante
- **Receitas** (income/outcome) — fora por decisão (ADR-005).
- **Open Finance** (agregadores tipo Pluggy) — puxa as transações sozinho; custo e privacidade
  a avaliar com o checklist de serviço externo do blueprint §1.
- **Nome e marca próprios** — conflita com o fork vivo (ADR-003) enquanto ele valer.
- **Abrir para o público** — fora por decisão (ADR-001).

## O que travou e por quê
- **13/10/2026 — rede do ambiente** recusa os portais da SEFAZ (SP, RJ, BA, SVRS) e a
  BrasilAPI. Não deu para testar a NFC-e nem o CNPJ. Destrava: o Lucas liberar os domínios em
  Network access do ambiente.

## Changelog
- **2026-10-13 — criação.** Horizonte a partir do kickoff com o Lucas; ordem pela ADR-004.
- **2026-10-13 — A, B e C.** Em andamento passa a ser a spec de padrões do grupo + tela rápida;
  foto entra como C (ADR-006, 007). Item 6 corrigido: não há padrão de casal embutido.
- **2026-10-13 — A e B no ar.** Saíram de "em andamento" (código + changelog da spec). Parcelado
  virou trabalho: foi para a spec da tela única (centavo na 1ª parcela, confirmado pelo Lucas).
- **2026-10-14 — tela única e parcelado no ar.** Saíram de "em andamento" (código + changelog da spec, PRs #8 e #9).
