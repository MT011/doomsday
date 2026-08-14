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

## Refinamento de duração e pré-venda

- [x] Permitir que o vídeo de abertura seja reproduzido integralmente antes da transição para a arte estática.
- [x] Aplicar um fade lento no final do vídeo, revelando gradualmente a imagem do Doutor Destino.
- [x] Evidenciar a pré-venda na abertura com um elemento visual de alta hierarquia.
- [x] Validar a sequência e a hierarquia em desktop e mobile e salvar checkpoint.

## Refinamento do selo de pré-venda

- [x] Reposicionar “PRÉ-VENDA ABERTA” no topo central do hero em desktop e mobile.
- [x] Aplicar tipografia branca, mais grossa e com maior impacto ao selo de pré-venda.
- [x] Validar o novo posicionamento e salvar checkpoint.

## Simplificação do hero

- [x] Remover a logo superior esquerda do cabeçalho sobre o hero.
- [x] Ampliar discretamente o selo central “PRÉ-VENDA ABERTA” em desktop e mobile.
- [x] Validar o novo equilíbrio visual e salvar checkpoint.
- [x] Subir levemente o selo central “PRÉ-VENDA ABERTA” no desktop e no mobile e salvar checkpoint.

## Unificação tipográfica do hero

- [x] Aplicar a fonte temática de “PRÉ-VENDA ABERTA” aos botões “Comprar ingressos” e “Conheça o filme”.
- [x] Aplicar a mesma linguagem tipográfica à navegação “O filme”/“Comprar ingressos” e ao status “PRÉ-VENDA AO VIVO”.
- [x] Validar legibilidade e consistência em desktop e mobile e salvar checkpoint.

## Refinamento de cores Doomsday

- [x] Aplicar um gradiente verde mais marcante no selo “PRÉ-VENDA ABERTA”.
- [x] Reforçar as linhas laterais e os detalhes quadrados verdes nas extremidades do selo.
- [x] Alterar o botão “COMPRAR INGRESSOS” para branco, preservando contraste e legibilidade.
- [x] Validar as cores em desktop e mobile e salvar checkpoint.
- [x] Aplicar o gradiente verde Doomsday ao botão “COMPRAR INGRESSOS” e deixar texto/ícone brancos; validar e salvar checkpoint.

## Unificação da paleta Doomsday

- [x] Escurecer o verde de destaques editoriais como “O começo do impossível”.
- [x] Ajustar os elementos verdes claros das páginas de localização, sessões, checkout e confirmação.
- [x] Ajustar assentos selecionados e demais estados interativos para verde Doomsday escuro, preservando legibilidade.
- [x] Validar contraste e estados em desktop/mobile e salvar checkpoint.
- [x] Aumentar a distinção visual entre assento disponível e selecionado (brilho/borda) e garantir contraste do texto no estado selecionado.
- [x] Validar visualmente as telas de checkout e confirmação com a nova paleta Doomsday em desktop e mobile.
- [x] Salvar checkpoint final da unificação da paleta.

## Navegação de retorno do fluxo

- [x] Fazer o botão Voltar da seleção de sessões retornar à tela inicial.
- [x] Fazer o botão Voltar de assentos retornar à seleção de sessões, preservando localização e sessão.
- [x] Fazer o botão Voltar do checkout retornar ao mapa de assentos, preservando assentos e tipos de ingresso.
- [x] Fazer o botão Voltar da confirmação retornar ao checkout quando acionado, preservando os dados do pedido.
- [x] Validar as rotas de retorno em desktop/mobile e salvar checkpoint.
- [x] Executar QA reproduzível das rotas de retorno: sessões → início, assentos → sessões, checkout → assentos e confirmação → checkout, registrando preservação de estado.
- [x] Salvar novo checkpoint após validar a navegação de retorno e registrar o ID correspondente.

## Redesenho cinematográfico após o hero

- [x] Substituir a seção “O evento” por narrativa visual de alto impacto com informações oficiais configuráveis do filme.
- [x] Adicionar fundos e imagens cinematográficas autorizadas para diferenciar as novas seções sem modificar o hero atual.
- [x] Criar blocos claros para formatos, experiência em sala, estreia e urgência da pré-venda.
- [x] Redesenhar a descoberta de cinemas como módulo de conversão com disponibilidade, alcance nacional e CTA direto.
- [x] Priorizar a organização mobile e validar o novo conteúdo em desktop e mobile.
- [x] Executar testes/build e salvar checkpoint do redesenho.

## Seleção de sessão, ingressos e resumo

- [x] Exibir datas de sessão de 18 a 23 de dezembro na etapa de seleção.
- [x] Manter horários e formatos de demonstração disponíveis para qualquer cidade selecionada.
- [x] Exibir controles de quantidade e tipo inteira/meia-entrada depois que o usuário selecionar um horário.
- [x] Atualizar o resumo “Seu pedido” com quantidade, subtotais, taxa e total antes da seleção de assentos.
- [x] Aplicar o limite de ingressos ao mapa de assentos e preservar os dados ao voltar entre etapas.
- [x] Cobrir as regras de preço e quantidade com testes, validar responsividade e salvar checkpoint.

## Ajuste de valores dos ingressos

- [x] Atualizar a inteira demonstrativa para R$ 51,28 e a meia-entrada para R$ 25,64 em sessões, resumo e confirmação.
- [x] Atualizar os testes de cálculo e validar tipos, testes e build antes do checkpoint.

## Posicionamento do seletor de ingressos

- [x] Exibir o seletor de inteira, meia e quantidade imediatamente abaixo do horário de sessão selecionado.
- [x] Preservar o comportamento e a legibilidade do painel em desktop e mobile, validando tipos, testes e build.

## Ajuste de horários e formatos

- [x] Manter quatro horários por data/cidade, incluindo 15:30 como a única sessão 3D.
- [x] Exibir as três sessões restantes como 2D · Tela premium e validar tipos, testes e build.

## Preparação da integração PIX AmploPay

- [x] Revisar a documentação e a autenticação oficiais da AmploPay para pagamentos PIX.
- [x] Definir fluxo seguro de criação, consulta e confirmação de cobranças PIX no servidor.
- [x] Solicitar somente as credenciais necessárias após documentar como serão protegidas e usadas.

## Integração PIX AmploPay

- [x] Cadastrar as chaves da AmploPay exclusivamente como segredos do servidor e validar permissões/expiração.
- [x] Preparar a criação de cobrança PIX no servidor com valor calculado internamente, identificador único e suporte a QR Code/copia e cola.
- [x] Preparar a persistência do estado da cobrança e do token de validação retornado pela AmploPay.
- [x] Preparar o endpoint de webhook idempotente para confirmar somente pagamentos `TRANSACTION_PAID` validados.
- [x] Preparar a experiência de checkout PIX, mantendo o cliente sem acesso a segredos.
- [x] Documentar o cadastro do webhook, cobrir credenciais e regras críticas com testes e validar tipos/build.
- [ ] Validar cobrança PIX real, persistência, webhook HTTPS e transição segura de pendente para pago antes de marcar o fluxo como operacional.
- [x] Publicar o site e receber confirmação explícita antes de ativar a criação de cobranças reais via PIX.
- [x] Habilitar a chave de ativação do PIX real no ambiente de produção e revalidar as credenciais AmploPay.
- [ ] Validar a rota pública HTTPS de webhook com uma cobrança real, comprovando que token inválido é rejeitado sem alterar o pagamento.
- [ ] Aguardar a primeira cobrança PIX gerada pelo usuário no site para validar o QR Code, a persistência e o webhook real.
