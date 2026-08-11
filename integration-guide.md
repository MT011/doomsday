# Guia de integração da operação real

Este projeto já separa a interface da camada de operação por contratos em `server/integrations.ts`. O modo atual é demonstrativo: nenhuma sessão real é vendida, nenhum assento é efetivamente bloqueado, nenhum pagamento é capturado e nenhum QR Code emitido pelo protótipo é válido para entrada.

## Dados de filme e campanha

O conteúdo editorial fica em `shared/film-config.ts`. Antes da publicação, a equipe deve confirmar com Marvel/Disney o texto final em português, a data e hora de abertura da pré-venda, territórios, classificação indicativa, formatos autorizados, materiais oficiais e regras de comunicação. A página oficial de referência usada no protótipo é `https://www.marvel.com/movies/avengers-doomsday`.

## Provedor de sessões e assentos

O operador de cinema ou ticketing deve fornecer uma API autenticada para listar sessões e disponibilidade. O adaptador precisa implementar `SessionProvider.listSessions`, recebendo `cinemaId` e `date`, e retornar identificador estável da sessão, data, horário, idioma, formato, sala e preço. Os endpoints esperados são conceituais e devem ser substituídos pelos URLs do contrato assinado:

| Operação | Método esperado | Exemplo de rota | Segredo/configuração necessária |
| --- | --- | --- | --- |
| Listar sessões | GET | `/v1/cinemas/{cinemaId}/sessions?date=YYYY-MM-DD&film=doomsday` | `CINEMA_API_BASE_URL`, `CINEMA_API_KEY` ou OAuth client credentials |
| Consultar mapa e disponibilidade | GET | `/v1/sessions/{sessionId}/seats` | Mesmo token, escopos de inventário |
| Bloquear assentos | POST | `/v1/seat-holds` | Token com permissão de hold; TTL definido pelo operador |
| Liberar hold | DELETE/POST | `/v1/seat-holds/{holdId}` | Token de inventário |
| Consultar status do hold | GET | `/v1/seat-holds/{holdId}` | Token de inventário |

O backend deve chamar `SeatInventoryProvider.holdSeats` em uma transação de curta duração, salvar o `holdId` e a expiração, e impedir avanço ao pagamento quando o hold expirar. A fonte de verdade de disponibilidade deve permanecer no operador; a interface nunca deve confiar apenas no estado do navegador.

## Pagamento

Escolha um gateway aprovado pela operação brasileira, como o provedor corporativo definido pelo contratante. O adaptador `PaymentProvider.authorize` deve receber somente uma referência do pedido, valor, método e e-mail; dados sensíveis de cartão devem ser coletados por hosted fields/tokenização do gateway, não armazenados pelo projeto. Configurações esperadas:

| Item | Exemplo de variável | Uso |
| --- | --- | --- |
| Ambiente | `PAYMENT_ENV` | `sandbox` durante homologação; `production` na abertura |
| URL | `PAYMENT_API_BASE_URL` | Endpoint do gateway escolhido |
| Credencial pública | `VITE_PAYMENT_PUBLIC_KEY` | Tokenização/hosted checkout no navegador |
| Credencial privada | `PAYMENT_SECRET_KEY` | Criação e consulta server-side |
| Assinatura | `PAYMENT_WEBHOOK_SECRET` | Verificação de eventos do gateway |
| Identificador de merchant | `PAYMENT_MERCHANT_ID` | Roteamento e conciliação |

O fluxo deve tratar pelo menos `authorized`, `pending`, `declined`, cancelamento e chargeback. O pedido só deve ser emitido depois da confirmação do pagamento de acordo com a política do gateway.

## Emissão e QR Code

O adaptador `TicketIssuer.issue` deve chamar o sistema oficial de bilheteria ou do cinema para gerar o ingresso. O retorno esperado é um `ticketId`, um payload assinado e a data de emissão. O QR Code exibido ao cliente deve codificar esse payload oficial; o QR do protótipo é apenas demonstrativo e aponta para um domínio fictício.

Configurações esperadas:

| Item | Exemplo de variável | Uso |
| --- | --- | --- |
| API de emissão | `TICKETING_API_BASE_URL` | Endpoint do emissor oficial |
| Credencial | `TICKETING_API_KEY` ou `TICKETING_CLIENT_SECRET` | Autenticação server-side |
| Identificador da campanha | `TICKETING_CAMPAIGN_ID` | Amarrar o filme à pré-venda |
| Webhook de emissão | `TICKETING_WEBHOOK_SECRET` | Validar atualização de emissão/cancelamento |
| Remetente | `EMAIL_FROM` | Remetente verificado do ingresso digital |

## E-mail e eventos

O endpoint atual de demonstração retorna `accepted`, `messageId`, destinatário e horário sem enviar uma mensagem externa. Na operação real, substitua a função por um provedor transacional aprovado, como o serviço corporativo indicado pelo contratante. O envio deve ocorrer depois da emissão confirmada e ser idempotente por `orderReference`.

Eventos/webhooks mínimos a implementar são `payment.authorized`, `payment.failed`, `payment.refunded`, `seat_hold.expired`, `ticket.issued`, `ticket.cancelled` e `email.delivery_failed`. Cada evento deve ser verificado por assinatura, persistido com sua chave idempotente e processado sem criar emissão duplicada.

## Credenciais e homologação

Antes de pedir qualquer segredo no projeto, a equipe deve entregar: contrato/API e ambiente de sandbox do operador de sessões, credenciais do gateway, contrato do emissor, segredo dos webhooks, remetente de e-mail verificado, regras de meia-entrada, política de cancelamento, dados da empresa responsável, termos de uso, política de privacidade/LGPD e subdomínio definitivo. A homologação deve testar venda aprovada, recusa, timeout, hold expirado, concorrência por um mesmo assento, reembolso, reenvio de e-mail e leitura do QR na entrada.

## Checklist de lançamento

A abertura pública somente deve ocorrer após substituir o catálogo de demonstração por catálogo autorizado, desligar as rotas de preview, confirmar que o preço vem da fonte oficial, ativar antifraude e conciliação, validar a observabilidade dos webhooks e executar uma compra de ponta a ponta em sandbox. O domínio e os materiais de marca também precisam ser aprovados pela Marvel/Disney e pelo operador de ingressos.
