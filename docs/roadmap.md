# Roadmap — o horizonte

> **Horizonte, sem data.** Cada item responde *"o que o produto quer ser"*, não *"o que estamos
> fazendo"*. Item que vira trabalho **sai daqui** e vira plano em `plans/`; no lugar fica uma
> linha apontando. Plano executado vira código + changelog.
>
> 🔁 **Gatilho:** ao fechar qualquer plano, releia esta página e promova o próximo item.
>
> Ordem = prioridade de hoje (13/10/2026). Cada item diz o **sinal de largada**, não prazo.

## Em andamento

- **Adicionar despesa em uma tela** → `plans/2026-10-13-despesa-em-uma-tela.md` (ADR-004).

## Próximos

### 1. Login com Google obrigatório (ADR-002)
Grupo só para membros; o link vira convite; a conta lembra "quem sou eu" em qualquer aparelho.
- Caminho provável: Auth.js (NextAuth v5) ou Better Auth com adapter Prisma — escolher no
  plano, conferindo a compatibilidade com o Next 16 do repo (`AGENTS.md`: a API mudou).
- Migração: grupos de hoje não têm dono. Quem abrir um grupo antigo logado vira membro e diz
  qual participante é; o acesso sem login acaba numa data combinada com o Lucas.
- Depende do Lucas: criar o cliente OAuth no Google Cloud (passo a passo no plano).
- **Largada:** a despesa em uma tela no ar.

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

### 4. Parcelado
"Comprei em 10x de R$ 120": lança uma parcela por mês na mesma data, com "(3/10)" no título.
- Reaproveitar a recorrência mensal que já existe, com número de parcelas e fim.
- Centavos: total que não divide exato (R$ 100 em 3x) — a diferença vai na 1ª parcela
  `[conferir com o Lucas]`. Cada parcela editável sozinha (o `finance` já viu parcela 2/3 com
  valor diferente da 1/3).
- **Largada:** despesa em uma tela pronta (o parcelado entra como opção dela).

### 5. Recorrente / assinaturas — completar o que existe
Já há diária, semanal e mensal. Faltam **anual**, **data de fim** e deixar claro na lista o que
é recorrente. Hoje a próxima ocorrência só nasce quando alguém abre o grupo — conferir se isso
basta para o Lucas.

### 6. Casal e grupo
Ideia do Lucas, ainda sem forma: *"casais têm dinâmicas diferentes… fica como uma ideia"*.
**Proposta (não decidida):** não dois "modos" de app, e sim **tipo de grupo** que só muda os
padrões — casal com divisão padrão salva no grupo (ex.: 75/25, que é "por partes" 3:1),
amigos com "igualmente". Hoje o padrão de divisão fica no aparelho (`localStorage`), não no
grupo. Também: divisão **por ajuste** (igual para todos, e alguém paga +R$ 10 a mais).
- **Largada:** depois do login; antes, uma rodada de perguntas com o Lucas sobre como ele e a
  Gio dividem hoje (o `finance` descreve o 75/25).

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
