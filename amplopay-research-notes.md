# Notas de pesquisa — AmploPay PIX

## Fontes consultadas

- [Introdução da documentação](https://app.amplopay.com/docs)
- [Autenticação da API](https://app.amplopay.com/docs/authentication)

## Achados iniciais

A documentação informa que a AmploPay utiliza duas credenciais obtidas no painel da conta: uma chave pública e uma chave secreta. Ambas devem ser enviadas em cada chamada da API, respectivamente nos cabeçalhos `x-public-key` e `x-secret-key`. As chaves geradas não são exibidas novamente, portanto precisam ser mantidas em local seguro.

A chave secreta não poderá ser enviada ao navegador, inserida em código-fonte ou incluída em registros. A integração deverá chamar a AmploPay exclusivamente pelo servidor do projeto, sob HTTPS, usando uma variável de ambiente protegida. Ainda será necessário confirmar, na documentação específica de PIX e webhooks, o endpoint, o corpo da requisição, a resposta com QR Code/código copia e cola, os estados da cobrança e a validação de notificações.

## Cobrança PIX

A documentação de “Receber pix” descreve a criação de uma cobrança via `POST /gateway/pix/receive`. O pedido precisa conter `identifier` único, `amount` em reais e `client`; pode incluir produtos, vencimento, metadados e `callbackUrl`. A resposta de sucesso retorna `transactionId`, `status`, taxa, dados do pedido e o objeto `pix`, que inclui o código copia e cola e uma imagem de QR Code.

O site deverá gerar o identificador no servidor, calcular o total no servidor a partir dos assentos reservados e registrar o `transactionId` retornado. O cliente receberá apenas o código PIX, a imagem/QR Code e um identificador interno não sensível. Não será permitido aceitar do navegador o valor final, o status de pagamento ou a confirmação como fonte de verdade.

## Confirmação por webhook

A AmploPay envia notificações ao `callbackUrl` associado à cobrança. A documentação apresenta, entre outros, os eventos `TRANSACTION_CREATED`, `TRANSACTION_PAID`, `TRANSACTION_CANCELED`, `TRANSACTION_REFUNDED` e `TRANSACTION_CHARGED_BACK`. Os payloads incluem um `token`, descrito como mecanismo de validação da autenticidade da notificação, além dos dados do cliente e da transação.

O endpoint do projeto deverá comparar o token recebido com o valor configurado na AmploPay usando comparação segura, localizar o pedido pelo identificador/ID de transação e registrar cada evento de forma idempotente. Somente `TRANSACTION_PAID`, após validação do token, identificador e valor esperado, poderá alterar a reserva de assentos para paga/emitida. Eventos repetidos, cancelamentos, estornos e payloads inválidos não poderão emitir novos ingressos.

## Operação e validação de credenciais

A AmploPay bloqueia consultas repetidas de status e orienta que o fluxo seja assíncrono: criar a cobrança com `callbackUrl`, aguardar o webhook e atualizar o pedido internamente. Consultas pontuais ficam restritas a ausência de webhook após tempo razoável, reconciliação ou suporte. A tela não deverá fazer polling direto contra a AmploPay; depois do QR Code, poderá consultar apenas um endpoint interno limitado que lê o estado já atualizado pelo webhook.

Quando as credenciais forem fornecidas, a primeira verificação será feita no servidor por `GET /gateway/producer/credentials`. A rota retorna nome, permissões, acesso total e expiração; antes de ativar PIX, será necessário confirmar que a credencial permite operações de transação e que não está expirada.

## Configuração correta do callback

A documentação determina que os webhooks são entregues por HTTP POST com JSON e que o endpoint deve responder com um status `2XX` após processá-los. Para cobranças criadas pela API, o `callbackUrl` é enviado na requisição e a resposta retorna um token para validar as notificações futuras. Como a AmploPay limita a 20 webhooks por integração, o projeto deverá utilizar uma única URL estável, como `/api/amplopay/webhook`, e nunca gerar uma URL diferente por pedido. O token retornado será associado à cobrança no banco de dados e não exposto à interface.

A rota de consulta pontual da AmploPay documenta que a transação é identificada pelo `id` retornado na criação e pelo `clientIdentifier` enviado pela aplicação. Para PIX, os estados apresentados são `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` e `CHARGED_BACK`, e os dados de QR Code podem ser apresentados como `pixInformation.qrCode` e `pixInformation.image`. O adaptador do projeto aceitará tanto a estrutura de criação documentada (`transactionId` e `pix.code`) quanto a estrutura de consulta (`id` e `pixInformation.qrCode`) sem alterar a fonte de verdade local.

## Desenho proposto para este projeto

1. O checkout validará os dados do comprador e assentos no servidor; o navegador nunca definirá o valor da cobrança.
2. O servidor criará uma cobrança em `POST /gateway/pix/receive`, enviando um identificador único do pedido, total calculado, dados do comprador, itens e um único `callbackUrl` estável.
3. O navegador receberá somente o QR Code/URL de imagem, o código copia e cola, uma referência interna e o status inicial pendente.
4. O endpoint de webhook validará o token devolvido pela AmploPay, processará os eventos de forma idempotente e só emitirá ingressos quando receber `TRANSACTION_PAID` válido.
5. A interface consultará apenas o estado do pedido no servidor. Nenhuma chamada periódica será feita diretamente à AmploPay.

## Credenciais e informações necessárias na próxima etapa

Para configurar a integração, serão necessárias a chave pública e a chave secreta da AmploPay. Elas serão cadastradas exclusivamente como variáveis de ambiente protegidas do projeto, respectivamente `AMPLOPAY_PUBLIC_KEY` e `AMPLOPAY_SECRET_KEY`; a chave secreta não será exibida no frontend, enviada por tRPC ao navegador ou salva em arquivos. Também será necessária uma URL pública HTTPS estável para o callback. O token de validação do webhook deverá ser armazenado por cobrança a partir da resposta de criação, conforme a documentação da AmploPay.

## Referências

- [Autenticação da AmploPay](https://app.amplopay.com/docs/authentication)
- [Receber PIX — AmploPay](https://app.amplopay.com/docs/endpoint/pix/receive)
- [Webhooks — AmploPay](https://app.amplopay.com/docs/webhooks)
- [Webhooks de pagamentos — AmploPay](https://app.amplopay.com/docs/webhooks/payment)
- [Polling bloqueado — AmploPay](https://app.amplopay.com/docs/faq/polling-blocked)
- [Teste de credenciais — AmploPay](https://app.amplopay.com/docs/endpoint/producer/credentials)
