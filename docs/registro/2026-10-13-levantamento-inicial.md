# Levantamento inicial — 13/10/2026

> **Registro.** Append-only, nunca editado. O que daqui virou regra ou plano está citado em
> `../roadmap.md` e `../plans/`.

## 1. Auditoria mobile

**Como:** Spliit rodando no container (Postgres 17 em Docker, `next dev`), Chromium headless,
locale pt-BR, `isMobile`, larguras 320 e 360 px. Grupo de teste com três participantes (um
de nome longo) e três despesas. Sete telas: início, despesas, criar despesa, saldos,
estatísticas, configurações, criar grupo. Mediu-se `scrollWidth` contra a largura, elementos
para fora da tela (fora de container com rolagem) e alvos de toque menores que 32 px. Os
prints foram vistos, não só medidos.

**Resultado:**

| | 320 px | 360 px |
|---|---|---|
| Vazamento horizontal | nenhum, nas 7 telas | nenhum |
| Alvos de toque < 32 px por tela | 3 a 17 | 2 a 16 |

- A largura está bem resolvida no original. **O problema é o fluxo:** criar despesa tem
  título, data, moeda, categoria, valor (5º campo), reembolso, "pago por" sem padrão, notas e
  recorrência, e um segundo cartão com "pago para" e "opções avançadas de divisão".
- Moeda padrão **Dólar americano (USD)**, porque `DEFAULT_CURRENCY_CODE` não está definido.
- O campo de data apareceu como `10/13/2026` mesmo com locale pt-BR `[conferir num celular
  real]` — pode ser coisa do headless.
- Abas do grupo só com ícone no celular (seis ícones sem texto).
- "Quem é você?" abre como bottom sheet ao entrar no grupo — o padrão de sheet já existe.

## 2. Nota fiscal pelo QR code (NFC-e)

- O QR do cupom (NFC-e, modelo 65) é uma **URL do portal da SEFAZ do estado** com a chave de
  acesso de 44 dígitos e parâmetros. A página é pública e mostra emitente, CNPJ, itens,
  valores, forma de pagamento, data e hora.
- **O endereço e o layout mudam por estado** (o RJ trocou a URL em 19/12/2023; ES e GO publicam
  as suas). Não achei biblioteca que cubra os 27 estados; há várias de um estado só
  (SP, PR, RS, ES), em Python e TypeScript. Conclusão: **um adaptador por UF**, começando
  por SP. `[incerto]` quantos estados usam o portal compartilhado do SVRS (o que reduziria
  o trabalho).
- Ler **no servidor**: o navegador bloqueia a leitura de outro domínio (CORS).
- A chave de 44 dígitos sozinha já diz UF, CNPJ do emitente, mês, série e número — sem rede.
  Serve de fallback (digitar a chave) e para achar o CNPJ.
- Riscos: layout mudando sem aviso, captcha `[incerto]` por estado, portal fora do ar, QR
  inválido por problema do emissor (relatos no fórum do ACBr), bloqueio de IP estrangeiro
  `[incerto]` — a Vercel tem região em São Paulo (`gru1`).
- **Não testado:** a rede do ambiente recusou `nfce.fazenda.sp.gov.br`,
  `consultadfe.fazenda.rj.gov.br`, `nfe.sefaz.ba.gov.br` e `dfe-portal.svrs.rs.gov.br`.

Fontes: [ACBr — extração de itens da NFC-e](https://www.projetoacbr.com.br/forum/topic/51548-extra%C3%A7%C3%A3o-de-informa%C3%A7%C3%B5es-da-nfce-gerada/),
[SEFAZ-ES QR code](https://sefaz.es.gov.br/qr-code),
[SEFAZ-RJ DF-e](https://portal.fazenda.rj.gov.br/dfe),
[SEFAZ-GO](https://goias.gov.br/economia/sefaz-disponibiliza-consulta-da-nota-fiscal-eletronica-do-consumidor-por-qr-code/),
[TabNews — parsear NF-e/NFC-e em JS](https://www.tabnews.com.br/shoc/como-parsear-nf-e-e-nfc-e-em-javascript-e-por-que-e-mais-complexo-do-que-parece),
[python-nfce-get (PR)](https://github.com/brunopenso/python-nfce-get),
[qrcodemercado (SP)](https://github.com/Flavio-Braga/qrcodemercado),
[kompra-justa-nfce-api](https://github.com/Mateuss18/kompra-justa-nfce-api),
[consultaNFE (RS)](https://github.com/ymoreiratiti/consultaNFE),
[tópico nfce no GitHub](https://github.com/topics/nfce).

## 3. Pix

- **Pix copia-e-cola / QR (BR Code)** é texto no padrão EMV: campo 59 = nome do recebedor
  (até 25 caracteres), 60 = cidade (até 15), 54 = valor quando vem, 26 = chave Pix, 62 = txid.
  Decodificar é trivial e não precisa de rede. Ideia: o usuário lê o QR **no nosso app**, a
  despesa nasce com nome, cidade e valor, e o código vai para a área de transferência para
  pagar no banco. QR dinâmico traz uma URL com mais dados `[conferir]`.
  Fontes: [Manual do BR Code (BCB)](https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf),
  [TabNews — payload do Pix](https://www.tabnews.com.br/usrbinenv/entendendo-o-payload-do-pix-copia-e-cola-e-gerando-um-qr-code-estatico).
- **Pix para CNPJ → ramo (CNAE) → categoria:** a BrasilAPI serve os dados abertos da Receita
  por CNPJ (`/api/cnpj/v1/{cnpj}`, com `cnae_fiscal`). Limite de uso não documentado nas
  fontes achadas `[conferir]`; a rede do ambiente recusou `brasilapi.com.br`.
  Fonte: [BrasilAPI CNPJ (wrapper)](https://glama.ai/mcp/servers/@guilhermelirio/brasil-api-mcp/tools/cnpj-search).
- **Compartilhar comprovante do banco para o app:** Web Share Target funciona em PWA no
  Android; **no iPhone não há suporte confirmado** (pedido aberto no WebKit desde 2019).
  Fontes: [WebKit bug 194593](https://bugs.webkit.org/show_bug.cgi?id=194593),
  [web.dev — Web Share](https://web.dev/articles/web-share).
- Pix para **pessoa física** continua sem pista automática: é aí que entram a caixa de
  entrada (registrar só o valor na hora) e a conciliação com o extrato. O `L-Peixe/finance`
  já classifica Pix por contraparte (`rules/contrapartes.yml`) e lê o PDF do Nubank.

## 4. Divisões do Splitwise que o Lucas não usava

- **Por partes:** pesos. 3 partes para um e 1 para outro = 75/25. É exatamente o rateio da
  casa do Lucas e da Gio no `finance`.
- **Por ajuste:** todo mundo divide igual e alguém paga um valor a mais ou a menos (ex.: "o
  Lucas pediu uma bebida de R$ 10 só para ele").
  Fontes: [Emma community](https://community.emma-app.com/t/what-important-features-are-we-missing/6046/175),
  [Lightsplit](https://lightsplit.com/blog/custom-split-shares-specific-amounts-guide).

## 5. Onde o app está

Vercel, projeto `spliit-peixe` (conta **gioguanaes**), Node 24, integração GitHub ligada,
produção em `spliit-peixe.vercel.app` no commit `6e02b08` (24/09). Deployment Protection (SSO)
ligada nos domínios `*.vercel.app` (`all_except_custom_domains`) `[conferir se o Lucas e a Gio
abrem sem login da Vercel]`.
