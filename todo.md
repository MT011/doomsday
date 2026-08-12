# Project TODO

- [x] Definir a experiência visual dark/cinematográfica com identidade original inspirada no tom de superprodução, sem copiar assets proprietários do Ingresso.com.
- [x] Criar a página de apresentação do filme com banner, sinopse, chamada para pré-venda e datas configuráveis.
- [x] Criar seleção em cascata de estado → cidade → cinema com os dados de cinemas extraídos do Ingresso.com.
- [x] Criar listagem de sessões por cinema com data, horário, idioma e formato.
- [x] Criar modelo de salas e mapa de assentos com layouts variáveis por cinema.
- [x] Implementar mapa de assentos com zoom, pan, estados disponível/selecionado/ocupado e acessibilidade por teclado.
- [x] Implementar carrinho com assentos, inteira/meia-entrada, taxas e total.
- [x] Implementar checkout com dados do comprador e seleção de pagamento em modo de demonstração.
- [x] Implementar confirmação do pedido com código, QR Code, download e envio por e-mail em modo de demonstração.
- [x] Criar contratos de integração desacoplados para disponibilidade de sessões, bloqueio temporário de assentos, emissão e pagamento oficiais.
- [x] Adicionar testes Vitest para regras de assentos, cálculo do carrinho e criação/validação do pedido.
- [x] Validar o fluxo visual em desktop e mobile, incluindo estados vazios e mensagens de erro.
- [x] Documentar as credenciais, APIs e webhooks que serão necessários para ligar o protótipo à operação real.
- [x] Salvar checkpoint final após revisar todos os itens concluídos.

## Pré-requisitos externos para abertura de vendas

- **Pendente externo — não implementado no protótipo:** obter contrato/API oficial com Marvel/Disney e o operador para sessões, disponibilidade, reserva temporária e emissão.
- **Pendente externo — não implementado no protótipo:** definir gateway, antifraude, regras de meia-entrada, cancelamento e conciliação.
- **Pendente externo — não implementado no protótipo:** confirmar domínio/subdomínio, certificados, remetente de e-mail e requisitos LGPD.
- **Pendente externo — não implementado no protótipo:** substituir o catálogo e os fluxos de demonstração por dados oficiais autorizados antes da abertura.

## Decisões técnicas

- O protótipo será executável ponta a ponta com dados de demonstração claramente identificados.
- A disponibilidade de assentos será tratada no servidor para evitar dupla venda; o frontend nunca será a fonte de verdade.
- A integração real com Ingresso.com, cinema, pagamentos e emissão ficará atrás de adaptadores, aguardando credenciais e autorização formal.
- O visual será original e temático, evitando copiar literalmente a interface, logotipos ou materiais proprietários de terceiros.
- Não serão inventados depoimentos, avaliações ou comentários de clientes.

## Registro histórico

- [x] Projeto full-stack inicializado em /home/ubuntu/doomsday-presale-flow.
- [x] Dados públicos de cinemas do Ingresso.com extraídos anteriormente para referência de localização.
- [x] Escopo de produto ampliado para fluxo completo de pré-venda.

## Critérios de aceite

- [x] O usuário consegue escolher localização, sessão e assentos.
- [x] O total é recalculado corretamente ao alternar inteira/meia-entrada.
- [x] Assentos ocupados não podem ser selecionados.
- [x] O usuário consegue avançar ao checkout e concluir uma compra de demonstração.
- [x] A confirmação mostra um identificador único e QR Code reproduzível.
- [x] O layout funciona em desktop e mobile e possui foco visível/labels acessíveis.
- [x] Os testes automatizados passam e o projeto compila sem erros.

## Pendências descobertas na revisão

- [x] Parametrizar conteúdo do filme em configuração compartilhada, incluindo data de estreia, sinopse e textos principais.
- [x] Implementar endpoint tRPC de envio de e-mail de demonstração e conectar o botão da confirmação a uma resposta verificável.
- [x] Definir interfaces/adaptadores explícitos para listar sessões oficiais, reservar/liberar assentos temporariamente, processar pagamento e emitir ingresso/QR oficial.
- [x] Validar visualmente o fluxo completo em desktop e mobile, incluindo sessões, mapa de assentos, checkout, confirmação, estados vazios e erros comuns.
- [x] Criar documentação técnica concreta com credenciais, provedores, endpoints esperados e webhooks/eventos necessários para a operação real.
- [x] Validar e registrar evidências dos estados vazios e de erro do fluxo, incluindo nenhum assento selecionado, formulário incompleto, falha no envio de e-mail demo e ausência de cinemas/sessões.
- [x] Validar e registrar evidências da falha no envio de e-mail demo, com cenário reproduzível e captura/nota do comportamento exibido.
- [x] Validar e registrar evidências do estado de ausência de cinemas para uma combinação sem resultados, incluindo comportamento dos selects e recuperação.
- [x] Implementar um cenário QA de ausência de cinemas atrelado a uma combinação específica de estado/cidade, permitindo que ao trocar a seleção os cinemas voltem a aparecer.
- [x] Capturar e registrar evidência visual/notas da recuperação após mudar estado/cidade no cenário sem cinemas.

## Atualização da abertura audiovisual

- [x] Remover a chamada “Uma experiência Marvel Studios” e o ícone de estrela do hero.
- [x] Substituir o lockup textual do cabeçalho pela logo de Avengers: Doomsday.
- [x] Preparar e hospedar o vídeo enviado como transição de abertura do hero.
- [x] Implementar a transição do vídeo para a arte estática do Doutor Destino, com alternativa para movimento reduzido.
- [x] Ajustar a composição do hero para mobile, mantendo logo centralizada e o Doutor Destino bem enquadrado.
- [x] Salvar o checkpoint da atualização audiovisual após a validação em desktop e mobile.
