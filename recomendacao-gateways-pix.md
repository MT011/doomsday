# Pesquisa de gateways para API Pix — projeto Doomsday

**Data da pesquisa:** 25 de agosto de 2026
**Projeto analisado:** site de pré-venda de ingressos com checkout próprio
**Gateway atual:** AmploPay
**Alternativa inicialmente considerada:** Cakto
**Autor:** Manus AI

## Nota de decisão

Sou uma IA, não um consultor financeiro licenciado. Este relatório é uma análise operacional e comercial baseada em documentação pública; não constitui garantia de aprovação, liquidação ou ausência de bloqueios. A decisão final deve considerar o contrato do provedor, o cadastro da empresa e um piloto real controlado.

## Conclusão executiva

A **melhor opção técnica equilibrada para este projeto é a Efí**, desde que a empresa aceite a configuração de certificado mTLS e obtenha uma proposta comercial confirmando a tarifa, o prazo de liquidação e o limite operacional. A Efí oferece cobrança Pix dinâmica por API, consulta, homologação, webhooks e uma estrutura de integração próxima do que o site já faz com a AmploPay. A tarifa pública localizada foi de **1,19%**, aproximadamente **R$ 0,61 em uma cobrança de R$ 51,28**.[1] [2]

A **melhor opção em custo e simplicidade de cobrança direta é a Woovi/OpenPix**. A documentação mostra valor variável em centavos, identificador próprio e eventos específicos de cobrança concluída, expirada e transação recebida. A tabela pública anuncia **0,80% por Pix confirmado**, com mínimo de **R$ 0,50**, ou plano fixo de **R$ 0,85**.[3] [4] Para o ingresso de R$ 51,28, a cobrança percentual ficaria abaixo do mínimo, portanto o custo anunciado seria aproximadamente **R$ 0,50**.

A **Cakto pode ser viável**, especialmente se a conta for PJ e nominal, mas eu não a escolheria apenas por causa do anúncio de “Pix a 0%” ou por uma promessa de aprovação. A documentação técnica usa um modelo de produto/oferta, os materiais comerciais apresentam um endpoint diferente, a política pública deixa o prazo de saque como “X dias úteis” e o webhook não utiliza HMAC. Para uma pré-venda de ingressos, a Cakto só deveria entrar no shortlist final após confirmação escrita de que aceita esse tipo de operação, que a conta nominal exibirá a razão social/CNPJ e que a cobrança poderá receber o valor dinâmico de cada pedido.[5] [6] [7] [8]

> **Recomendação prática:** não migrar diretamente da AmploPay para a Cakto em produção. Primeiro, abrir e aprovar a conta PJ nominal, obter as condições contratuais por escrito, fazer um piloto com cobrança real de baixo volume e comparar a taxa de conclusão, os alertas relatados pelos clientes, a latência do webhook e o prazo de liquidação. Se a Cakto não esclarecer esses pontos, seguir com **Efí** ou **Woovi/OpenPix** como alternativas prioritárias.

## Um esclarecimento importante sobre “aprovação” e avisos no Pix

No cartão, “taxa de aprovação” é uma métrica comercial central de adquirentes e roteadores. No Pix, não existe uma única aprovação controlada pelo gateway. A transação passa por validações do banco do pagador, disponibilidade de saldo, limites, dados do recebedor, regras de segurança, marcações de fraude e funcionamento do PSP recebedor. O Banco Central explica que os dados associados à chave permitem ao pagador confirmar a identidade do recebedor.[9]

Assim, não encontrei nas fontes consultadas uma métrica independente e comparável de aprovação Pix para AmploPay, Cakto, Efí, Woovi, Asaas, PagBank ou Mercado Pago. As alegações de “99%” ou “melhor aprovação” encontradas em páginas comerciais são publicidade do próprio fornecedor e não devem ser tratadas como evidência auditada para a venda de ingressos.[10]

Nenhum gateway legítimo pode garantir que o aplicativo do banco do pagador nunca exibirá aviso. O próprio PagBank documenta que todos os QR Codes Pix passam por análise de risco.[11] Se o alerta estiver relacionado à conta recebedora, ao CNPJ, à chave ou a uma marcação de fraude, trocar de provedor sem investigar a origem pode apenas deslocar — ou agravar — o problema.

O caminho correto para reduzir desconfiança é operar com **CNPJ e razão social coerentes**, conta PJ nominal quando disponível, domínio HTTPS, política clara de reembolso, descrição transparente da pré-venda e suporte acessível. O artigo da Cakto sobre conta nominal afirma que a razão social e o CNPJ da empresa aparecem nos comprovantes em vez do nome da plataforma; como se trata de conteúdo editorial da própria Cakto e menciona uma fase regulatória já passada, essa condição deve ser confirmada no contrato e em um pagamento de teste.[8]

## Comparação das alternativas

| Provedor | Integração Pix documentada | Webhook e segurança | Tarifa pública encontrada | Adequação ao site de ingressos | Principal ressalva |
|---|---|---|---:|---|---|
| **Efí** | Cobrança imediata dinâmica, `POST /v2/cob`, consulta e homologação | Webhook com mTLS, TLS 1.2 e possibilidade de IP/HMAC adicional | **1,19%** via API | **Muito alta** | Configuração mTLS e condições comerciais por perfil |
| **Woovi/OpenPix** | Cobrança com valor em centavos e identificador próprio | Eventos de cobrança concluída/expirada e transação recebida; mecanismo de autenticação deve ser confirmado | **0,80%**, mínimo R$ 0,50; ou R$ 0,85 fixo | **Alta** | Confirmar liquidação, autenticação de webhook, suporte e conta nominal |
| **Cakto** | `POST /public_api/payments/`, QR Code, copia e cola, expiração e idempotência | Segredo no corpo; sem HMAC; até cinco retentativas e timeout de 8 s | **0% anunciado** na API | **Média, condicionada** | Modelo de oferta/produto, taxa efetiva, saque, retenção e aceite de ingressos |
| **Asaas** | Cobrança Pix dinâmica, QR Code e consulta | Eventos `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, reembolsos e outros | R$ 0,99 por fatura nos três primeiros meses; depois R$ 1,99 | **Alta tecnicamente** | Custo fixo alto para ingressos unitários; conta precisa de aprovação/chave |
| **PagBank** | API Orders com QR Code Pix, copia e cola, sandbox e idempotência | Webhooks e confirmação de autenticidade documentados | Não localizada de forma aplicável à API | **Alta** | Exige chave Pix ativa; análise de risco em todos os QR Codes; tarifa a negociar |
| **Mercado Pago** | Checkout Transparente/Orders API com Pix e notificações | Documentação de notificações e integração em produção | Não localizada de forma aplicável ao checkout/API | **Média-alta** | Custos e fluxo comercial precisam ser confirmados para a conta brasileira |
| **Pagar.me** | Pix dentro de pedido, QR Code, expiração, webhook, estorno e split | Recursos documentados, mas detalhe técnico ficou bloqueado por Cloudflare | **1,19%** em oferta pública, com plano e condições | **Média** | Tarifa pública associada a plano; documentação e contrato devem ser validados |
| **Appmax** | Pix disponível na plataforma e integrações comerciais | Orquestração, múltiplos adquirentes e antifraude anunciados | Não localizada de forma transparente | **Média para checkout; baixa para API Pix direta** | “99% approval” é claim comercial e parece mais relevante para cartão |

## Análise por candidato

### 1. Efí — melhor equilíbrio técnico para uma operação regularizada

A Efí documenta cobrança imediata com QR Code dinâmico, identificador definido pelo recebedor, consulta individual/listagem e ambiente de homologação. O ambiente de teste possui uma particularidade importante: valores acima de R$ 10,00 permanecem ativos sem confirmação automática, portanto o ingresso de R$ 51,28 exige teste específico de webhook ou simulação apropriada.[1]

O webhook utiliza mTLS, certificado público da Efí e TLS mínimo 1.2, com opção de camada adicional por IP ou HMAC na URL.[2] Isso adiciona trabalho de infraestrutura, mas é um ponto forte para um projeto que precisa liberar assentos somente depois de uma confirmação autenticada. A Efí aparece com selo RA 1000 e resolução de 90,8% no painel consultado, indicador complementar de atendimento e não de aprovação Pix.[12]

### 2. Woovi/OpenPix — melhor custo público e encaixe direto no pedido

A API da Woovi/OpenPix aceita um `correlationID` próprio, valor em centavos e dados opcionais do cliente. O desenho é adequado para o pedido do site porque o servidor pode associar diretamente a cobrança ao pedido e aos assentos, sem criar um catálogo ou uma oferta para cada combinação de sessão.[3]

Os eventos publicados incluem `OPENPIX:CHARGE_COMPLETED`, `OPENPIX:CHARGE_EXPIRED`, `OPENPIX:TRANSACTION_RECEIVED`, movimentos confirmados/falhos e eventos de disputa. A estrutura atende bem ao fluxo “reservar assentos → aguardar pagamento → emitir somente após confirmação”. A empresa aparece como verificada e com reputação “Ótima” no Reclame Aqui, mas a página também lista temas de retenção de saldo, reembolso e suporte; isso deve ser investigado antes de concentrar uma pré-venda importante.[4] [13]

### 3. Cakto — possível, porém dependente de diligência específica

A documentação técnica da Cakto é funcional: exige OAuth2, `X-Idempotency-Key`, oferece QR Code, copia e cola, expiração e consulta por pedido. A idempotência documentada é de 24 horas, com tratamento de reuso idêntico, conflito para payload diferente e liberação após falha 5xx.[5]

O ponto de atenção é o modelo de negócio. A cobrança documentada usa `offerId` e itens vinculados a uma oferta, enquanto a página comercial mostra um exemplo simplificado com `value` em um endpoint diferente. Para o site Doomsday, é preciso confirmar se o valor pode ser calculado por pedido e se a oferta pode ser reutilizada sem gerar inconsistência de preço, sessão ou assento.[5] [7]

O webhook Cakto tem retentativas e eventos úteis, mas a própria documentação informa que não há HMAC nem header de assinatura; a validação usa um `secret` no corpo da mensagem. O endpoint também precisa responder em até oito segundos e ser idempotente.[6] Esse desenho é implementável, mas exige que o segredo nunca seja registrado em logs, que o HTTPS seja obrigatório e que a aplicação mantenha deduplicação própria.

A Cakto anuncia Pix a 0% e mantém um painel público de status. Na consulta, a API apresentava 99,948% de disponibilidade em 90 dias e a Payment API, 99,999%; esses números são úteis como sinal operacional, mas vêm do monitor da própria empresa e não medem aprovação ou liquidação bancária.[7] [14]

### 4. Asaas — integração simples, mas menos econômica em ingresso unitário

O Asaas documenta a criação de cobrança Pix dinâmica e a consulta do QR Code por ID, retornando imagem codificada, payload e validade. Os eventos incluem `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, reembolso e outras transições.[15]

O custo público encontrado é fixo por cobrança: R$ 0,99 nos três primeiros meses e R$ 1,99 depois para pessoa jurídica.[16] Em um ingresso de R$ 51,28, R$ 1,99 equivale a aproximadamente 3,88% do valor, antes de outros custos. Se o usuário permitir que o cliente compre vários ingressos em uma única cobrança, o custo efetivo melhora; para pedidos unitários, Efí ou Woovi tendem a ser mais competitivos.

### 5. PagBank, Mercado Pago e Pagar.me — alternativas fortes, mas com preço ou contrato menos claros

PagBank e Mercado Pago têm escala e documentação pública de APIs. O PagBank documenta QR Code Pix de uso único, estados de espera/recusa/pago, sandbox e análise de risco, mas exige chave Pix ativa e não apresentou, nesta pesquisa, uma tarifa de API aplicável ao caso.[11] O Mercado Pago oferece Checkout Transparente e Orders API com Pix, mas o custo efetivo depende da conta e do fluxo comercial.[17]

O Pagar.me publica tarifa de 1,19% em planos comerciais e documenta QR Code, webhook, estorno e split, mas a página técnica ficou protegida por Cloudflare durante a consulta. Por isso, não é prudente escolhê-lo sem obter a documentação completa e as condições contratuais.[18]

## Comparação do custo por cobrança de R$ 51,28

| Provedor | Regra pública usada | Custo aproximado por cobrança | Observação |
|---|---:|---:|---|
| Cakto | 0% anunciado | **R$ 0,00** | Não é tarifa contratual confirmada; política pública menciona taxas variáveis |
| Woovi/OpenPix | 0,80%, mínimo R$ 0,50 | **R$ 0,50** | O percentual puro seria R$ 0,41, mas aplica-se o mínimo |
| Efí | 1,19% | **R$ 0,61** | Tarifa pública; confirmar proposta e impostos/condições |
| Pagar.me | 1,19% | **R$ 0,61** | Oferta associada a plano e recebimento em 15 dias |
| Asaas | R$ 1,99 após promoção | **R$ 1,99** | Aproximadamente 3,88% do ingresso unitário |
| PagBank/Mercado Pago | Não localizado para este fluxo | **Indeterminado** | Solicitar proposta comercial da API/checkout |

Os valores acima não incluem eventuais tarifas de saque, antecipação, reembolso, split, impostos, reservas ou condições negociadas. A página pública da Cakto anuncia 0%, mas sua política de pagamentos diz que as taxas são informadas ao produtor e podem incluir processamento, saque e disputas.[7] [19]

## Recomendação final para o projeto

Minha ordem de validação seria: **Efí em primeiro lugar**, **Woovi/OpenPix em segundo**, e **Cakto somente como opção condicionada à conta nominal e à confirmação contratual**. A Cakto pode ganhar a disputa se confirmar simultaneamente cinco pontos: aceitação formal de venda de ingressos; cobrança com valor dinâmico sem catálogo artificial; razão social/CNPJ exibidos ao pagador; tarifa 0% válida para API e para o perfil da empresa; e prazo de liquidação/saque compatível com a pré-venda.

Se a prioridade absoluta for reduzir custo e a operação aceitar uma conta especializada em Pix, Woovi/OpenPix parece a opção pública mais direta. Se a prioridade for robustez técnica e segurança de webhook, Efí é a escolha mais equilibrada, mesmo com mais complexidade de configuração. Se a prioridade for facilidade operacional e o valor médio por pedido for alto, Asaas também merece um piloto, mas não é a alternativa mais barata para o ingresso unitário.

## Checklist antes de qualquer migração

1. Confirmar com o provedor o CNPJ recebedor, nome exibido no app do pagador, instituição liquidante, conta nominal e existência de qualquer marcação ou restrição.
2. Pedir uma proposta escrita com tarifa efetiva por Pix, mínimo/máximo, tarifa de saque, prazo de liquidação, reserva de contingência, reembolso, limites, suporte e regras para eventos ou venda de ingressos.
3. Fazer onboarding completo com dados verdadeiros da empresa, domínio do site, política de reembolso, termos da pré-venda e descrição clara do produto.
4. Testar em ambiente de homologação e depois em produção com baixo volume, usando QR Code dinâmico, valor correto, expiração, webhook duplicado, webhook atrasado, pagamento recebido, pagamento expirado, reembolso e reconciliação.
5. Instrumentar o projeto para medir `checkout_created`, `pix_generated`, `paid`, `expired`, `refused/failed`, latência do webhook, tempo até liquidação e relatos de alerta no banco do pagador.
6. Migrar por etapas, mantendo a AmploPay disponível como contingência durante o período de observação, sem fazer roteamento para contornar alertas ou restrições antifraude.
7. Só emitir o ingresso depois de confirmação autenticada do webhook e reconciliação do valor, pedido, identificador da cobrança e status definitivo.

## Referências

[1]: https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas/ — Efí, “Cobranças imediatas”.
[2]: https://dev.efipay.com.br/docs/api-pix/webhooks/ — Efí, “Webhooks API Pix”.
[3]: https://developers.woovi.com/en/docs/flows/flow-create-charge-api — Woovi/OpenPix, “Creating a Charge using API”.
[4]: https://developers.woovi.com/en/docs/webhook/webhook-events-type — Woovi/OpenPix, “Webhook Event Types”.
[5]: https://docs.cakto.com.br/api-reference/payments/create-pix — Cakto, “Criar Cobrança Pix”.
[6]: https://docs.cakto.com.br/conceitos/webhooks — Cakto, “Guia de Webhooks”.
[7]: https://www.cakto.com.br/api — Cakto, “API e Pix”.
[8]: https://blog.cakto.com.br/conta-nominal-na-cakto-como-migrar-e-quais-as-vantagens/ — Cakto, “Conta nominal na Cakto”.
[9]: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html — Banco Central, “DICT API”.
[10]: https://appmax.com.br/en-US/payment-gateway/ — Appmax, página comercial com alegações de aprovação e orquestração.
[11]: https://developer.pagbank.com.br/reference/criar-pedido-com-qr-code-pix-v2 — PagBank Developers, “Criar pedido com QR Code PIX”.
[12]: https://www.reclameaqui.com.br/empresa/efi/ — Reclame Aqui, Efí Bank.
[13]: https://www.reclameaqui.com.br/empresa/woovi-instituicao-de-pagamento/ — Reclame Aqui, Woovi.
[14]: https://status.cakto.com.br/ — Cakto Status.
[15]: https://docs.asaas.com/docs/cobrancas-via-pix — Asaas, “Cobranças via Pix”.
[16]: https://www.asaas.com/pix-asaas — Asaas, página comercial de Pix.
[17]: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix — Mercado Pago Developers, “Pix”.
[18]: https://www.pagar.me/ofertas — Pagar.me, “Ofertas”.
[19]: https://www.cakto.com.br/pagamentos — Cakto, “Política de Pagamentos”.
