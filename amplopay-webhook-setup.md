# Ativação do PIX AmploPay

> **Estado atual:** as credenciais foram verificadas com sucesso e o código de integração está preparado, mas a criação de cobranças permanece desativada até a publicação do site e a confirmação explícita de ativação. Nenhuma cobrança real é criada nesta etapa.

## Para que serve o webhook

Um webhook é uma notificação automática enviada pela AmploPay ao servidor quando uma cobrança muda de estado. Para PIX, é o mecanismo que informa que o pagamento foi efetivado. O site não confiará em uma confirmação feita pelo navegador e não consultará a AmploPay repetidamente; ele aguardará o evento `TRANSACTION_PAID` no endpoint seguro.

## Fluxo que já está preparado

| Etapa | Funcionamento implementado |
|---|---|
| Criação da cobrança | O servidor calcula o total, cria um identificador único e chama `POST /gateway/pix/receive`. |
| Entrega ao comprador | O checkout apresenta o QR Code e o código PIX copia e cola devolvidos pela AmploPay. |
| Retorno da AmploPay | A cobrança inclui uma URL fixa, `/api/amplopay/webhook`, e a AmploPay devolve um token de validação. |
| Confirmação | O webhook valida token, ID e valor. Somente um `TRANSACTION_PAID` válido marca o pagamento como aprovado. |
| Proteção contra duplicidade | Eventos repetidos são tratados de forma idempotente; cancelamentos e estornos não emitem novos ingressos. |

## Próximos passos para ativar pagamentos reais

1. Salve o checkpoint e publique o site pelo botão **Publish** da interface do projeto, garantindo um domínio HTTPS público.
2. Confirme que deseja ativar a geração real de cobranças PIX. Essa ação fará com que o botão **Gerar código PIX** envie pedidos reais à AmploPay.
3. A configuração atual criará o webhook via API usando a URL pública do site. Não é necessário cadastrar manualmente uma URL distinta por pedido.
4. Após a primeira cobrança gerada, confirme no painel AmploPay que a transação possui o callback configurado. O código usa sempre a mesma rota para respeitar o limite de webhooks da plataforma.

## Requisitos de segurança mantidos

As chaves pública e secreta ficam somente nas variáveis protegidas do servidor. A chave secreta nunca é enviada para o navegador, persistida no banco ou gravada em logs. O banco guarda apenas dados operacionais da cobrança, QR Code/código PIX, estado, referência da AmploPay e token de validação associado à cobrança.

## Referências

- [Autenticação da AmploPay](https://app.amplopay.com/docs/authentication)
- [Receber PIX](https://app.amplopay.com/docs/endpoint/pix/receive)
- [Introdução a webhooks](https://app.amplopay.com/docs/webhooks)
- [Webhooks de pagamentos](https://app.amplopay.com/docs/webhooks/payment)
- [Polling bloqueado](https://app.amplopay.com/docs/faq/polling-blocked)
