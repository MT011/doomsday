# Pesquisa de gateway PIX — notas de trabalho

Data: 25 de agosto de 2026.

## Escopo

A pesquisa busca alternativas de API PIX para o site de pré-venda, com foco em experiência do pagador, estabilidade, webhook, idempotência, conciliação, suporte, custos e adequação operacional. A expressão “sem aviso na hora do PIX” não será tratada como promessa possível: alertas são decididos pelo banco ou instituição do pagador e por controles antifraude. O critério seguro é avaliar redução de fricção legítima, qualidade do cadastro e compliance, sem tentar burlar alertas.

## Cakto — confirmação na documentação oficial

Fonte principal: https://docs.cakto.com.br/introduction

A documentação informa uma API REST com base `https://api.cakto.com.br/public_api/`. O acesso exige conta ativa, `client_id`, `client_secret` e token OAuth2, com autorização no formato Bearer. A documentação enumera endpoints para pagamentos, pedidos e webhooks.

Fonte da cobrança PIX: https://docs.cakto.com.br/api-reference/payments/create-pix

A cobrança é criada por `POST /public_api/payments/` com `paymentMethod: "pix"`, cliente, itens vinculados a uma oferta (`offerId`), quantidade, validade (`pixExpiresIn`) e metadados. O header `X-Idempotency-Key` é obrigatório. A resposta de sucesso documentada retorna `id`, `refId`, `status: "waiting_payment"`, `checkoutUrl` e um objeto `pix` com `qrCode`, `qrCodeBase64` e `expirationDate`.

A documentação também declara que o split financeiro é aplicado conforme o painel da Cakto, sem envio de dados financeiros pela aplicação. A idempotência tem retenção documentada de 24 horas; reuso com payload idêntico retorna a resposta original, reuso com payload diferente resulta em `409`, e uma falha `5xx` libera a chave para nova tentativa. Há limites documentados de 60 requisições por minuto por IP e 120 por minuto por token.

Ainda falta confirmar, em páginas oficiais específicas, o guia de webhooks, a assinatura/verificação dos eventos, a lista de estados de pagamento, prazos de liquidação, tarifas aplicáveis ao caso do usuário, regras de reserva/expiração e se o modelo de produto/oferta da Cakto se encaixa bem na venda unitária de ingressos com assentos dinâmicos.

## Estado da pesquisa

Nenhuma credencial foi usada, nenhuma chamada transacional foi feita e nenhuma alteração foi realizada no código do projeto. A próxima etapa é cruzar a documentação Cakto com alternativas como Mercado Pago, Pagar.me, Efí, Asaas e provedores especializados em Pix, usando fontes oficiais e reputação pública somente como evidência complementar.

## Cakto — webhooks e idempotência

Fonte de webhooks: https://docs.cakto.com.br/conceitos/webhooks

A Cakto informa que envia `POST` para a URL cadastrada quando ocorre uma compra aprovada, um Pix gerado ou outro evento da conta. A documentação mostra resposta `2xx` como confirmação de recebimento e reenvio quando a aplicação não responde com sucesso. Ela também apresenta seções para validação da origem, retentativas, catálogo de eventos, histórico de entregas, teste e reenvio manual. Ainda é necessário extrair o mecanismo exato de autenticação/assinatura e os campos dos eventos de pagamento.

Fonte de idempotência: https://docs.cakto.com.br/conceitos/idempotencia

A idempotência é exigida em `POST /public_api/payments/`, usa `X-Idempotency-Key`, recomenda UUID v4 e mantém a chave por 24 horas. A repetição com payload idêntico devolve a resposta original, a repetição durante processamento ou com payload diferente retorna `409`, e a aplicação deve persistir a chave com a operação de negócio e reutilizá-la em todas as tentativas.

## Mercado Pago — confirmação inicial na documentação oficial

Fontes consultadas: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/overview e https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix

O Mercado Pago documenta um Checkout Transparente via Orders API, sem redirecionamento obrigatório para fora do site, com personalização da experiência. A documentação inclui Pix por QR Code ou link de pagamento, configuração de notificações, compra de teste, medição da qualidade da integração e publicação em produção.

Na página específica de Pix, o fluxo é descrito como parte da Orders API e exige chaves Pix cadastradas na conta do vendedor. A documentação permite escolher processamento manual ou automático ao criar a order. Para o projeto, o ponto positivo é a possibilidade de manter uma experiência integrada e contar com documentação explícita sobre qualidade de integração; ainda falta levantar o endpoint exato de criação, o payload de QR Code, os eventos e a política comercial aplicável à conta brasileira.

## Pagar.me — confirmação inicial na documentação oficial

Fonte: https://docs.pagar.me/docs/pix-1

A documentação do Pagar.me informa que o lojista precisa de conta transacional em participante direto do arranjo para a integração PIX. O provedor descreve criação de venda PIX dentro de um pedido, com expiração, retorno de QR Code e confirmação posterior por webhook. Também declara suporte a transferência para a conta em tempo real, estorno total ou parcial e split com dois ou mais recebedores.

A página visual e a versão Markdown ficaram protegidas por CAPTCHA durante a consulta; os pontos acima vêm do conteúdo oficial extraído pela própria página, mas tarifas, payload exato, assinatura de webhook e condições comerciais ainda precisam de confirmação adicional antes de qualquer recomendação final.

## Efí — confirmação inicial na documentação oficial

Fontes consultadas: https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas/ e https://dev.efipay.com.br/docs/api-pix/webhooks/

A Efí documenta cobranças imediatas com `POST /v2/cob` sem `txid` ou `PUT /v2/cob/:txid` com identificador definido pelo recebedor. Também oferece revisão, consulta individual e consulta de lista com filtros, além de homologação que simula estados retornados pela API e pelo webhook. A documentação ressalva que, no ambiente de homologação, valores entre R$ 0,01 e R$ 10,00 são confirmados e valores acima de R$ 10,00 permanecem ativos sem confirmação; isso é relevante para o planejamento de testes do ingresso de R$ 51,28.

Nos webhooks, a Efí informa callback `POST` quando há alteração de status da transação e timeout de 60 segundos. O padrão documentado usa mTLS, com certificado público da Efí no servidor do recebedor, TLS mínimo 1.2 e possibilidade de camada adicional de segurança por IP ou HMAC na URL. Isso tende a exigir mais configuração operacional que a integração atual, mas oferece um modelo de callback mais estruturado.

A documentação consultada confirma maturidade técnica para API Pix e testes, mas não fornece por si só taxa de aprovação comparável entre gateways. A tarifa encontrada na busca oficial da Efí deve ser confirmada na página comercial e na proposta da conta, pois pode variar por perfil.

## Asaas — confirmação inicial na documentação oficial

Fonte consultada: https://docs.asaas.com/docs/pix-overview

A documentação do Asaas descreve API para receber por Pix com QR Codes dinâmicos e estáticos, geração de chave Pix e acompanhamento de cobranças. Ela alerta que, sem uma chave Pix cadastrada na conta, o sistema pode gerar uma chave temporária e o processamento pode sofrer atraso; recomenda cadastrar uma chave para processamento instantâneo. A mesma documentação informa que a funcionalidade de recebimento via Pix depende de aprovação completa da conta e prova de vida.

A busca oficial também aponta sandbox para testar pagamento de QR Codes Pix e endpoints de webhooks, mas a URL específica inicialmente tentada para a página de QR Code dinâmico retornou 404 e não será usada como evidência. Ainda falta confirmar na referência atual do Asaas o endpoint de criação, payload de QR Code, eventos de status, idempotência e a tarifa exata para o perfil da conta.

## Asaas — QR Code e eventos de pagamento

Fontes: https://docs.asaas.com/docs/cobrancas-via-pix e https://docs.asaas.com/docs/payment-events

O Asaas documenta cobrança com `billingType: PIX` em `POST /v3/lean/payments`, seguida de consulta do QR Code em `GET /v3/payments/{id}/pixQrCode`. O retorno documentado inclui `encodedImage`, `payload` e `expirationDate`. O QR Code é dinâmico, tem vencimento e pode ser pago uma única vez.

A documentação de eventos informa que pagamentos geram webhooks de status, incluindo `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED` e outros. Para liberar o ingresso, o sistema deve tratar o evento de negócio correto conforme a liquidação definida pelo provedor, validar a autenticidade do webhook e manter idempotência própria. O Asaas parece tecnicamente compatível com o fluxo atual, com a ressalva de que a conta precisa estar aprovada e ter chave Pix cadastrada para evitar atrasos.

## Cakto — posicionamento comercial e cautelas

Fonte comercial: https://www.cakto.com.br/api

A página comercial da Cakto anuncia “Pix com 0% de taxa”, checkout transparente, split e uma API para SaaS. Ela também usa como argumento uma taxa de renovação de até 87% para Pix Automático. Esses números são afirmações comerciais da própria Cakto, não uma medição independente de aprovação para o caso de ingressos; devem ser tratados como hipótese a validar com proposta comercial, contrato e piloto.

A documentação técnica da Cakto usa um modelo de produto/oferta e retorna `checkoutUrl`, além de QR Code e copia e cola. Para venda unitária de ingressos com preço e assentos definidos dinamicamente, será necessário confirmar se a oferta pode ser criada ou reutilizada com valor variável sem criar atrito ou inconsistência de catálogo.

## Critério regulatório

Foi localizada a página geral do Banco Central sobre instituições de pagamento: https://www.bcb.gov.br/estabilidadefinanceira/instituicaopagamento. A visualização automatizada não retornou conteúdo legível nesta sessão, portanto ela ainda não será usada para afirmar o status regulatório de nenhum candidato. Esse status deverá ser conferido no cadastro oficial do BC e nos contratos de cada provedor.

## Reputação pública — evidência complementar

Fonte Cakto: https://www.reclameaqui.com.br/empresa/cakto-pay/

Na página consultada do Reclame Aqui, a Cakto Pay aparece com reputação “Ótima” e nota média do consumidor de 8,3/10 nos seis meses de 01/02/2026 a 31/07/2026. A página informa 4.610 reclamações recebidas, 91,7% respondidas, 87,7% resolvidas, 75,1% dos avaliadores dizendo que voltariam a fazer negócio e tempo médio de resposta de 6 dias e 19 horas. Isso é um indicador de atendimento/reputação de consumidores, não de aprovação do Pix.

Fonte Asaas: https://www.reclameaqui.com.br/empresa/asaas-gestao-financeira/

A página consultada do Reclame Aqui mostra reputação “Ótima”, empresa verificada e resolução de 89,5% das reclamações no painel visualizado. As reclamações recentes listadas incluem alteração cadastral, saldo retido, conta bloqueada e dificuldade de atendimento. Esses relatos não provam que a operação do usuário terá o mesmo comportamento, mas indicam que análise de onboarding, retenção de saldo e suporte deve entrar na diligência.

Os dados de reputação são dinâmicos e devem ser rechecados antes da contratação. Não existe, nas páginas consultadas, uma taxa independente e comparável de aprovação de cobranças Pix para os candidatos.

## Tarifas públicas localizadas

Fonte Cakto: https://www.cakto.com.br/api

A Cakto anuncia Pix a 0% na sua página de API e descreve o produto como voltado a SaaS e plataformas digitais. A mesma página mistura benefícios de API com claims de marketing — como “única API com taxa zero”, integração média e métricas de conversão — que não devem ser usados como benchmark independente de aprovação. A documentação técnica, além disso, usa produtos e ofertas como base para criar pagamentos.

Fonte Asaas: https://www.asaas.com/pix-asaas

O Asaas publica para pessoa jurídica R$ 0,99 por fatura Pix nos três primeiros meses e R$ 1,99 por fatura depois, com observação de que as taxas exibidas são padrão e as condições do contrato podem variar. A página afirma recebimento em segundos após a confirmação e informa que a tarifa é cobrada somente se a cobrança for paga.

Fonte Efí: https://sejaefi.com.br/tarifas

A Efí publica 1,19% para receber por QR Code dinâmico via API e 1,19% para Pix Cob/Pix CobV via API. Também informa que tarifas podem variar por data de contratação e negociação comercial. Para um ingresso de R$ 51,28, 1,19% equivale a aproximadamente R$ 0,61 por cobrança, antes de considerar condições específicas do contrato.

Fonte Pagar.me: https://www.pagar.me/ofertas

O Pagar.me publica 1,19% para Pix nos planos à vista e parcelado, com condições operacionais associadas aos planos, como recebimento da venda em 15 dias. A documentação técnica afirma suporte a QR Code, webhook, estorno e split. É necessário confirmar se a tarifa pública se aplica ao fluxo/API e ao perfil da operação, pois a própria documentação de ajuda informa que cada transação pode ter taxa contratada.

Fonte Mercado Pago: https://www.mercadopago.com.br/ajuda/33399

A página de custos de Checkout não expôs os valores na extração pública desta sessão. A documentação técnica confirma Checkout Transparente via Orders API e Pix com QR Code ou link, mas a tarifa de Pix processado por checkout precisa ser obtida no simulador ou na conta comercial, não inferida da tarifa de Pix simples da conta.

## Woovi/OpenPix — confirmação inicial na documentação oficial

Fontes: https://developers.woovi.com/en/docs/flows/flow-create-charge-api e https://developers.woovi.com/en/docs/webhook/webhook-events-type

A documentação da Woovi/OpenPix mostra criação de cobrança via `POST https://api.openpix.com.br/api/openpix/v1/charge`, usando `Authorization` com `appID`, `correlationID` próprio e valor em centavos. O objeto opcional de cliente aceita combinações de nome com CPF/CNPJ, e-mail ou telefone. Isso se encaixa diretamente em um pedido de ingresso com identificador próprio e valor dinâmico.

Os eventos documentados incluem `OPENPIX:CHARGE_CREATED`, `OPENPIX:CHARGE_COMPLETED`, `OPENPIX:CHARGE_EXPIRED`, `OPENPIX:TRANSACTION_RECEIVED`, movimentos confirmados/falhos e eventos de disputa do mecanismo especial de devolução do Pix. A documentação técnica parece mais alinhada a uma cobrança Pix direta que o modelo de produto/oferta da Cakto; ainda falta confirmar tarifas, liquidação, reputação, suporte, requisitos cadastrais e mecanismo de autenticação dos webhooks.

## Observação adicional do painel Cakto — webhook agrupado

No formulário autenticado de Webhooks da Cakto, o modo **Agrupado** exibiu um modelo com `secret`, `event` e `data` como uma lista de itens da venda. O exemplo mostrou `event: purchase_approved`, itens com `id`, `refId`, cliente, oferta, produto, `status: paid`, `baseAmount`, `amount`, `fees`, `paymentMethod`, `paidAt` e timestamps. O webhook do projeto foi configurado para a URL oficial `/api/cakto/webhook`, vinculado ao produto `MOVIE | Avengers`, com eventos de aprovação, recusa, reembolso e chargeback. A chave real foi gerada e inserida no painel, mas não deve ser registrada neste documento.

## Alertas exibidos no momento do Pix

Fontes consultadas: https://www.bcb.gov.br/estabilidadefinanceira/pix-seguranca e https://www.bcb.gov.br/meubc/faqs/p/marcacaode-chave-pix

A pesquisa encontrou referência oficial do Banco Central a marcações de chave Pix e mecanismos de segurança. Um alerta exibido ao pagador pode estar relacionado à instituição, à conta/chave recebedora, ao perfil da transação ou a sinais de fraude. Trocar de gateway não garante a remoção de avisos; usar um provedor diferente apenas para tentar escapar de alertas seria inadequado e poderia aumentar o risco de bloqueio, retenção ou investigação.

A abordagem segura é confirmar a razão do alerta com o gateway atual, verificar se a conta recebedora está regular, usar CNPJ e nome empresarial coerentes no cadastro, publicar política de reembolso e suporte, evitar descrições ambíguas, manter o domínio HTTPS e pedir revisão formal ao PSP/participante responsável quando houver marcação indevida. A pesquisa não vai recomendar qualquer mecanismo de bypass.

## Cakto — diligência contratual

Fonte: https://www.cakto.com.br/termos-de-uso

Os termos consultados identificam a contratada como CAKTO PAY LTDA, CNPJ 52.328.926/0001-04, e descrevem serviços de captura, processamento, roteamento, liquidação e gestão de pagamentos. O contrato prevê análise de risco operacional e legal no cadastro e durante o recebimento, podendo recusar determinadas partes ou operações. Também prevê bloqueio ou suspensão em hipóteses de dados incorretos, violação legal/contratual ou investigação de fraude.

Os termos ainda descrevem uma reserva de contingência durante o aviso prévio e período de transição, com possibilidade de retenção para cobrir obrigações. O anexo de fraude/chargeback trata de transações contestadas, retenção e medidas de ressarcimento. Essas cláusulas não significam que ocorrerão no caso do usuário, mas tornam indispensável obter por escrito as condições específicas para venda de ingressos, prazo de liquidação, suporte em evento de pico, critérios de reserva e política para produtos/serviços presenciais ou eventos.

## Cakto — política pública de pagamentos

Fontes: https://www.cakto.com.br/pagamentos e https://www.cakto.com.br/politica-de-pagamentos

A página oficial correta `/pagamentos` informa que a Cakto aceita Pix, que taxas podem variar por meio de pagamento e são informadas previamente, e que podem existir taxa de processamento, taxa de saque e cobranças adicionais em chargebacks/disputas. Ela descreve repasse após período de liberação variável por categoria e informa o prazo de saque como “X dias úteis”, sem especificar o número na página. O link `/politica-de-pagamentos` do rodapé retornou 404, embora `/pagamentos` tenha funcionado.

Para a pré-venda, isso significa que “Pix a 0%” na página da API não é suficiente para calcular custo líquido, disponibilidade do saldo ou risco de reserva. Antes de escolher Cakto, será necessário obter por escrito a tarifa efetiva, prazo de liquidação, prazo de saque, política de retenção, tratamento de eventos presenciais/ingressos e suporte em caso de alerta ou bloqueio.

## PagBank — confirmação na documentação oficial

Fontes: https://developer.pagbank.com.br/docs/servicos-de-pedidos-e-pagamentos e https://developer.pagbank.com.br/reference/criar-pedido-com-qr-code-pix-v2

A documentação do PagBank confirma uma API de Orders com criação de pedido por QR Code Pix, retorno de copia e cola e integração com webhooks, além de sandbox, idempotência e certificado digital no ecossistema de APIs. Na referência específica, o QR Code é de uso único; o pedido exige ao menos uma chave Pix de endereçamento ativa e, se houver várias, a documentação recomenda chave aleatória para geração do QR Code. Os estados exibidos incluem `WAITING`, `DECLINED` e `PAID`.

A própria página avisa que todos os QR Codes Pix passam por análise de risco. Isso é positivo como transparência de controle, mas reforça que nenhum provedor sério consegue prometer ausência de alerta ou aprovação universal. Ainda falta confirmar a tarifa comercial de Pix da API, o prazo de liquidação e as condições de onboarding para o perfil de venda de ingressos.

## Woovi/OpenPix — preços e operação

Fonte comercial: https://woovi.com/planos-e-precos/

A Woovi publica plano percentual de 0,80% por Pix confirmado, com tarifa mínima de R$ 0,50 e máxima de R$ 5,00, e plano fixo de R$ 0,85 por Pix confirmado. A página afirma que não há custo para gerar o QR Code e lista webhook, envio de recibos, QR Code dinâmico, split, reembolso e API Pix como recursos. Também informa saque automático para conta bancária e taxa de R$ 1,00 para saques abaixo de R$ 500,00.

A página pública de status da Woovi ficou protegida por CAPTCHA nesta sessão, então não foi possível validar de forma independente o claim de disponibilidade. Os preços e recursos são oficiais, mas devem ser confirmados para volume, prazo de liquidação, onboarding e política de risco da conta do usuário.

## Cakto — detalhes completos do webhook confirmados

Fonte: https://docs.cakto.com.br/conceitos/webhooks

A Cakto declara que o webhook envia JSON com `secret`, `event` e `data`; o `secret` é gerado ao criar o webhook e deve ser comparado com o valor armazenado em variável de ambiente. A documentação afirma explicitamente que não há assinatura HMAC nem header de assinatura. O callback deve usar HTTPS.

Os eventos listados incluem `purchase_approved`, `purchase_refused`, `refund`, `chargeback` e `pix_gerado`. A entrega tem timeout de 8 segundos, até cinco retentativas com intervalos de 5 segundos, 1 minuto, 2 minutos e 30 segundos, 6 minutos e 30 minutos, e possibilidade de reenvio manual. A Cakto recomenda responder `2xx` rapidamente, processar de forma assíncrona e deduplicar o evento usando `data.id`.

Para o projeto, a presença de eventos e retentativas é adequada, mas a ausência de HMAC e o segredo no próprio corpo exigem proteção rigorosa do endpoint, comparação em tempo constante, HTTPS, não registrar o payload em logs e idempotência interna. A documentação técnica está melhor detalhada que a política pública de pagamentos, mas a escolha ainda depende da validação comercial e operacional da conta.

## Reputação pública — Mercado Pago e PagBank

Fonte Mercado Pago: https://www.reclameaqui.com.br/empresa/mercado-pago/

A página consultada do Reclame Aqui mostra Mercado Pago como empresa verificada, com reputação “Ótima” e resolução de 81,1% das reclamações no painel acessível. Entre os temas recentes aparecem contestação de Pix, crédito de venda não disponibilizado e outros assuntos de conta. O volume é muito maior que o dos demais candidatos, então números absolutos de reclamações não são comparáveis sem denominador de clientes/transações.

Fonte PagBank: https://www.reclameaqui.com.br/empresa/pagseguro/

O PagBank aparece como empresa verificada com selo RA 1000. A página acessível lista reclamações recentes sobre bloqueio de conta, retenção de recebíveis e bloqueios após vendas. Esses relatos devem ser considerados como risco de suporte/liquidação a investigar, não como previsão do caso do usuário.

Fonte Banco Central/DICT: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html

A documentação do DICT explica que as informações associadas às chaves — incluindo CPF, CNPJ, telefone, e-mail ou EVP — permitem ao pagador confirmar a identidade do recebedor. Portanto, a forma correta de reduzir desconfiança é operar com a conta empresarial regularizada e com nome/CNPJ coerentes; não existe uma opção legítima de ocultar ou desativar a identificação no app do pagador.

## Ponto crítico de diligência da Cakto

Há uma divergência entre materiais oficiais. A página comercial `https://www.cakto.com.br/api` mostra um exemplo simplificado `POST /v1/payments` com `billingType: "PIX"` e `value`, enquanto a documentação técnica atual `https://docs.cakto.com.br/api-reference/payments/create-pix` usa `POST https://api.cakto.com.br/public_api/payments/`, autenticação OAuth2 e itens vinculados a `offerId`. A documentação também informa que o split depende de configurações do painel.

Antes de implementar Cakto, essa diferença deve ser esclarecida com o suporte ou com um sandbox funcional. Para o site de ingressos, o ponto decisivo é saber se o valor pode ser calculado por pedido sem criar uma nova oferta por combinação de sessão/assento, e qual nome/identidade do recebedor aparecerá no app do pagador.

## Cakto — conta nominal e identificação do recebedor

Fonte: https://blog.cakto.com.br/conta-nominal-na-cakto-como-migrar-e-quais-as-vantagens/

Um artigo do blog oficial da Cakto afirma que a conta nominal PJ exibe a razão social e o CNPJ da empresa recebedora nos comprovantes de Pix e não o nome da plataforma. O mesmo artigo relaciona conta nominal a limites maiores, maior rastreabilidade e menor risco de inconsistência cadastral.

Esse material é editorial/comercial e não substitui contrato ou confirmação da equipe de risco. Além disso, ele menciona uma fase de adaptação até fevereiro de 2026, que é uma referência temporal anterior à data desta pesquisa. A existência, elegibilidade, disponibilidade e efeito da conta nominal devem ser confirmados para o CNPJ do usuário. Mesmo com identificação nominal, alertas de segurança do banco do pagador continuam possíveis.

## Efí — reputação pública

Fonte: https://www.reclameaqui.com.br/empresa/efi/

A página consultada mostra o Efí Bank como empresa verificada com selo RA 1000 e resolução de 90,8% das reclamações no painel acessível. Reclamações recentes listadas incluem devolução de contestação Pix, conta encerrada com saldo retido e demora na abertura de conta. Esses dados servem como sinal de suporte e onboarding, não como taxa de aprovação Pix.

## Woovi — reputação pública

Fonte: https://www.reclameaqui.com.br/empresa/woovi-instituicao-de-pagamento/

A Woovi aparece como empresa verificada, com reputação “Ótima” no Reclame Aqui. A página consultada lista temas recentes relacionados a cadastro, suporte, reembolso e retenção de saldo após encerramento de conta. Como nos demais casos, isso é evidência complementar de atendimento e risco operacional percebido; não mede aprovação Pix nem substitui piloto de pagamentos.

## Pagar.me — limitação de verificação

Fonte: https://docs.pagar.me/docs/pix-1

A página oficial salva na sessão retornou bloqueio do Cloudflare, portanto a documentação do Pagar.me não pôde ser validada diretamente em detalhe. Os recursos mencionados no material de busca e na oferta comercial — Pix, QR Code, webhook, estorno e split — permanecem como itens a confirmar no onboarding. O provedor não deve ser escolhido com base na taxa pública de 1,19% sem confirmar contrato, integração atual e liquidação.

## Cakto — status público

Fonte: https://status.cakto.com.br/

Na consulta de 25/08/2026, a página pública da Cakto mostrava todos os sistemas operacionais. O painel indicava 99,948% de disponibilidade para Cakto API, 99,986% para Cakto Checkout e 99,999% para Payment API nos últimos 90 dias; o painel geral indicava 99,989% nos últimos 90 dias e uma interrupção detectada há uma semana. Esses números são do monitor público da própria empresa e não informam taxa de aprovação, latência de webhook ou liquidação bancária.

## Verificação regulatória — limitação

A busca localizou listas do Banco Central publicadas em julho/agosto de 2026 que mencionam Asaas e Woovi, mas as URLs de PDF de 03/08/2026 e 04/08/2026 retornaram 404 nesta sessão. Por isso, o relatório não deve afirmar, com base nessa tentativa, a modalidade ou o status regulatório de nenhum candidato. A checagem regulatória final deve ser feita no cadastro oficial atual do BC ou exigida nos documentos contratuais/onboarding do provedor.

## Appmax — alegações comerciais e pontos de atenção

Fonte: https://appmax.com.br/en-US/payment-gateway/

A página comercial da Appmax anuncia Pix, boleto e cartão, webhooks/integrações no ecossistema, liquidação D+1, múltiplos adquirentes, orquestração, antifraude e “99% approval rate”. Também apresenta casos de parceiros com evolução de aprovação. A página informa que a Appmax opera como subadquirente e divulga CNPJ 27.000.511/0001-60, alegando enquadramento regulatório próprio.

Como a página é material comercial e ficou protegida por CAPTCHA durante a consulta, a métrica de 99% e os cases não são comparáveis a uma taxa independente de aprovação Pix para o projeto. A promessa de múltiplos adquirentes e roteamento é mais relevante para cartão do que para Pix, que depende da conta/PSP recebedor e dos controles do banco pagador. Tarifas, API Pix direta, webhook e política de liquidação devem ser confirmados no contrato e na documentação do onboarding.

## Cakto — autenticação confirmada na documentação enviada

Fonte: https://docs.cakto.com.br/authentication#2-solicitando-token-de-acesso

A Cakto usa OAuth2. As chaves são criadas no painel em Integrações → Cakto API; o `client_secret` aparece somente no momento da criação. O token é obtido por `POST https://api.cakto.com.br/public_api/token/` com `Content-Type: application/x-www-form-urlencoded` e os campos `client_id` e `client_secret`. A resposta documentada contém `access_token`, `expires_in: 36000`, `token_type: Bearer` e escopo. As chamadas autenticadas devem usar `Authorization: Bearer <access_token>`.

A implementação deverá manter o token em memória no backend, com renovação antes da expiração, sem expor `client_id` ou `client_secret` ao navegador e sem persistir o token em logs ou no banco.

## Cakto — requisitos adicionais para a implementação confirmados em 25/08/2026

Fonte: https://docs.cakto.com.br/api-reference/payments/create-pix

A referência atual exige, na prática, `customer.name`, `customer.email`, `customer.phone`, `customer.fingerprint`, `customer.docType`, `customer.docNumber` e um `items` com exatamente um `offerId`. Também marca `antifraudProfilingAttemptReference` como obrigatório, descrevendo-o como a referência de uma sessão de profiling Nethone gerada no frontend antes do pagamento. Portanto, a migração não é somente uma troca de chamada no backend: será necessário verificar a documentação do SDK/profiling da Cakto e incluir essa etapa no frontend ou confirmar com o suporte se há uma alternativa para o caso de ingressos.

A resposta retorna `id`, `refId`, `externalId`, `checkoutUrl`, `amount`, `fees` e `pix.qrCode`/`qrCodeBase64`. A cobrança usa exatamente um item associado a uma oferta. `pixExpiresIn` tem mínimo de 60 segundos e deve respeitar o limite configurado no produto; o exemplo de erro mostra limite de 3600 segundos. A API documenta erros distintos para oferta inexistente/inativa, conta bloqueada, token inválido, escopo ausente, idempotência em conflito e rate limit.

## Cakto — SDK e profiling antifraude confirmados

Fontes: https://docs.cakto.com.br/sdk/visao-geral e https://docs.cakto.com.br/sdk/antifraude

A Cakto documenta um SDK de navegador carregado por `https://cakto-sdk.pages.dev/cakto-sdk.min.js`, inicializado com `client_id`. O fluxo antifraude deve iniciar no carregamento da página com `caktoSdk.initAntifraud()`, ser finalizado antes da cobrança com `completeAntifraudProfile()`, e fornecer ao backend o valor retornado por `getAntifraudReference()`. A documentação diz que o antifraude funciona somente no browser, requer uma única instância do SDK e é destinado à análise de risco.

A referência de cobrança Pix marca `antifraudProfilingAttemptReference` como obrigatória, portanto a migração Cakto exige uma alteração real no frontend, não apenas substituição do endpoint no servidor. O `client_id` público pode ser usado no browser conforme a documentação, mas o `client_secret` deve permanecer exclusivamente no backend.

## Impacto do modelo de ofertas no checkout Doomsday

Fonte: https://docs.cakto.com.br/api-reference/offers/create

A Cakto permite criar uma oferta existente para um produto por `POST /public_api/offers/`, com nome, preço e produto, e gera um identificador/link para a oferta. A cobrança Pix exige `items` com exatamente um item e `offerId`; o preço final é derivado da oferta, não de um campo `amount` enviado livremente pelo site.

Isso é um ponto crítico para o checkout atual, que permite até oito ingressos e combinações de inteira (R$ 51,28) e meia (R$ 25,64). A integração não pode simplesmente trocar o payload AmploPay por um payload Cakto preservando todas as combinações. As opções são: criar/provisionar ofertas para cada combinação de total; criar ofertas dinamicamente e armazenar seus IDs; simplificar temporariamente o carrinho para uma oferta/preço; ou confirmar com a Cakto se existe um recurso oficial de cobrança com valor externo/dinâmico para esse caso. Não devemos implementar um valor divergente do `offerId`, pois a API pode rejeitar a cobrança ou criar inconsistência de conciliação.

## Oferta Cakto enviada pelo proprietário — verificação visual

Fonte: https://pay.cakto.com.br/zbcjxrj_1062942

A página pública carregou corretamente e exibe o produto/oferta **MOVIE | Avengers**, preço da oferta de **R$ 51,28 à vista**, pagamento **PIX**, taxa de serviço de **R$ 0,99** e total exibido ao comprador de **R$ 52,27**. O checkout informa que o pagamento é processado pela Cakto e mostra também o nome **Robert John** nos termos de uso do produtor. O link, portanto, é uma oferta pública válida e confirma que a criação do produto/oferta pelo painel funcionou.

Ponto de atenção: para o site Doomsday, a taxa de serviço de R$ 0,99 aparece além do preço da oferta. Isso pode fazer o cliente pagar mais do que o total calculado pelo site. Antes de usar essa oferta como base da integração, é necessário confirmar no painel se a taxa é repassada ao comprador, se pode ser absorvida pelo produtor e como a API retorna `amount`/`fees`. Também é necessário confirmar se o produtor/nome mostrado como Robert John é a identidade correta da operação; não devemos tentar ocultar ou substituir a identidade real para evitar alertas antifraude.

## Confirmação do caminho Produto → Oferta → API

A oferta pública `https://pay.cakto.com.br/zbcjxrj_1062942` está válida e renderiza o produto `MOVIE | Avengers`, oferta de R$ 51,28 e Pix. O link público comprova a existência da oferta, mas não expõe de forma segura o `product_id` interno necessário para criar novas ofertas via API.

A tentativa de abrir o painel Cakto na área de produtos nesta sessão não exibiu conteúdo autenticado. Não é correto inferir que `1062942` ou `zbcjxrj` seja o `product_id`: esses valores pertencem ao link/identificador público da oferta. Para a integração dinâmica, o ID do produto deve ser copiado do painel ou obtido com uma chamada autenticada de listagem de produtos usando uma chave com escopo adequado. A oferta manual criada pode ser usada como referência, mas o backend ainda precisa conhecer o produto e o comportamento da taxa de serviço antes de gerar ofertas para outros totais.

## Painel Cakto autenticado — produto confirmado

Em 25/08/2026, no painel autenticado Cakto → Produtos → Meus Produtos, o produto **MOVIE | Avengers** apareceu como **Ativo**, com preço-base de **R$ 51,28**. O painel não exibiu o identificador interno na listagem textual; ainda é necessário abrir os detalhes do produto ou usar a API autenticada de produtos para obter o `product_id`. O link da oferta pública já confirmado continua sendo `zbcjxrj_1062942`/`https://pay.cakto.com.br/zbcjxrj_1062942`, mas não deve ser tratado como `product_id` sem confirmação.

## Rota da oferta no DOM do painel

A inspeção do DOM da listagem autenticada encontrou `MOVIE | Avengers` em um elemento com `href` vazio, sem expor a rota ou o identificador interno do produto. A única rota navegável confirmada foi `/dashboard/products?tab=products`; o link público da oferta permanece separado. O `product_id` ainda deve ser obtido abrindo os detalhes ou via API de listagem com a chave adequada.

## Product ID confirmado no painel Cakto

Ao abrir a linha `MOVIE | Avengers` no painel autenticado, a URL de edição exibiu o identificador interno:

`2ac23a52-425f-4974-8ae9-5aeed5b7f7b4`

Rota observada: `https://app.cakto.com.br/dashboard/products/2ac23a52-425f-4974-8ae9-5aeed5b7f7b4/edit?tab=general`.

A página estava no modo de edição, mas nenhuma ação de alteração ou salvamento foi realizada. O cadastro apresenta abas de Geral, Configurações, Checkout, Links e outras, confirmando que o produto criado pelo painel é o recurso correto para associar novas ofertas via API.

## Chave Cakto visível no painel — escopos insuficientes

Na área Cakto API do painel, a chave `MOVIE` aparece com Client ID parcialmente visível e segredo mascarado, mas o botão mostra **Escopos (0)**. Portanto, essa chave não está pronta para autenticar a integração. Não copiei nem revelei o segredo e não realizei nenhuma ação de criação/alteração nesta tela.

Para o backend dinâmico, é necessário criar ou editar uma chave com os escopos mínimos documentados para as operações utilizadas: criação de ofertas e criação de cobranças Pix; leitura de produtos é necessária apenas para localizar/confirmar o `product_id` por API. O `product_id` já foi confirmado no painel como `2ac23a52-425f-4974-8ae9-5aeed5b7f7b4`.

## Permissões da chave MOVIE

O botão `Escopos (0)` foi aberto apenas para inspeção; a lista de opções não ficou exposta na leitura textual, e nenhum escopo foi marcado ou salvo. A chave atual continua inadequada para o backend porque o painel mostra zero escopos.

## Formulário de nova chave Cakto

O painel exibiu o formulário **Criar Chave API** com campo de nome e escopos separados em Leitura, Escrita, Produtos, Ofertas, Pedidos, Assinaturas, Webhooks, Tokenização de Cartão e Pagamentos. A chave adequada para o projeto deve restringir-se a produtos/ofertas/pagamentos conforme as operações utilizadas, com leitura/escrita necessárias; não será concedida tokenização de cartão. A criação ainda não foi submetida.

## Escopos selecionados para a chave de produção

No formulário Cakto foi selecionado apenas: **Escrita**, **Ofertas** e **Pagamentos**. Não foram selecionados Leitura, Produtos, Pedidos, Assinaturas, Webhooks ou Tokenização de Cartão. Como o `product_id` já foi localizado no painel, a aplicação não precisa ler produtos em produção. A chave ainda não foi submetida.

## Resultado da criação da chave Cakto

A Cakto criou a chave `MOVIE-DOOMSDAY-PROD` em 25/08/2026. O modal de confirmação exibiu somente os escopos **Escrita** e **Ofertas**, totalizando 2 escopos; o escopo **Pagamentos não ficou selecionado**, apesar da tentativa de marcá-lo. O client ID apareceu no painel, mas o client secret não foi copiado, registrado ou incluído neste relatório. A chave, portanto, ainda não está pronta para gerar cobranças Pix até receber a permissão de Pagamentos.
