# Validação visual do protótipo

A validação foi executada em 11 de agosto de 2026 no preview local do projeto, em viewport desktop de 1280×900 e viewport móvel de 390×844.

## Telas desktop verificadas

Foram capturadas as telas `/?screen=sessions`, `/?screen=seats`, `/?screen=checkout` e `/?screen=confirmation`. A tela de sessões mostrou os três selects em cascata, o cinema de referência, as datas, os horários, idioma, formato e o resumo lateral. A tela de assentos mostrou o painel escuro com tela, fileiras, assentos disponíveis em azul, assentos selecionados em vermelho, assentos ocupados em cinza, legenda, controles de zoom e área de arraste. A tela de checkout mostrou os dados do comprador, Pix/cartão, aviso de modo demonstração e resumo com inteira/meia-entrada. A confirmação mostrou código `DD-DEMO-PREVIEW`, QR Code, cinema, sala, data, horário e total.

## Telas mobile verificadas

As mesmas quatro telas foram capturadas em 390×844. A landing e o fluxo mantiveram hierarquia tipográfica, contraste e controles dentro da largura útil. O mapa de assentos preservou o canvas horizontalmente navegável, com controles de zoom e pan; o recorte parcial no viewport é intencional, pois a sala pode ser arrastada. O checkout empilhou os campos do comprador e a confirmação preservou o cartão de ingresso e a identificação do pedido.

## Resultado e pontos de atenção

A validação visual não encontrou erro evidente de renderização ou contraste. O mapa possui uma área interna maior que a viewport para acomodar layouts de salas variáveis. As telas de preview usam `?screen=` apenas para QA e não substituem o fluxo real. As sessões, preços, ocupação, holds, pagamento e QR do modo demonstração não devem ser usados para abrir vendas sem os adaptadores oficiais e credenciais correspondentes.

## Estados vazios e validação negativa

Também foram capturadas em desktop de 1280×900 as rotas `/?screen=sessions&empty=1`, `/?screen=seats&empty=1` e `/?screen=checkout&empty=1`. A primeira exibiu a mensagem “Nenhuma sessão disponível para este cinema na data selecionada” e desabilitou o avanço. A segunda exibiu o mapa sem seleção, resumo zerado e a ação de pagamento sem itens. A terceira exibiu campos vazios, resumo zerado e um aviso de QA indicando que dados incompletos/assentos ausentes devem ser rejeitados; o handler server-side também valida nome, e-mail, documento e quantidade de assentos. O endpoint de e-mail de demonstração possui teste automatizado de retorno rastreável; falhas de rede são encaminhadas ao `onError` do mutation e mostradas ao usuário como toast.

## Últimos cenários QA

Foram capturadas em 1280×900 as rotas `/?screen=sessions&noCinemas=1` e `/?screen=confirmation&emailError=1`. Na primeira, o seletor de cinema ficou desabilitado com “Nenhum cinema disponível”, apareceu a mensagem de recuperação e o avanço foi bloqueado. Na segunda, a confirmação exibiu o aviso “falha de envio simulada”; ao acionar o botão, o cenário reproduzível dispara a mensagem de erro “Não foi possível enviar a confirmação. Tente novamente.” sem chamar o endpoint. Isso complementa o tratamento real de rede no callback `onError`.

## Comparação de recuperação

A captura `/?screen=sessions&noCinemas=1` mostrou o select “Nenhum cinema disponível” e a mensagem de recuperação. A captura `/?screen=sessions&noCinemas=1&recovered=1` mostrou Acre, Rio Branco e Cine Araújo Rio Branco, comprovando que a troca para uma combinação com resultados recupera a lista.

Foi identificado um ponto de consistência: no estado sem cinemas, o resumo lateral ainda usava o primeiro cinema global como fallback, embora a localização selecionada fosse São Paulo. Esse fallback deve ser ajustado para não exibir um cinema de outra cidade durante o estado vazio.

Após a correção, a captura sem cinemas passou a exibir “Nenhum cinema disponível” também no resumo e “Nenhum cinema disponível · São Paulo, SP” no cabeçalho da sessão, sem misturar dados de Rio Branco. A captura recuperada continua exibindo Acre, Rio Branco e Cine Araújo Rio Branco com sessões. O comportamento atende ao cenário de ausência e recuperação.

## Navegação de retorno

A navegação foi validada visualmente em `/?screen=sessions`, `/?screen=seats`, `/?screen=checkout` e `/?screen=confirmation`, em desktop e mobile. O botão Voltar aparece no topo do fluxo e mantém posição, contraste e leitura adequados. As regras implementadas são: sessões → tela inicial; assentos → sessões; checkout → assentos; confirmação → checkout. O estado de localização, sessão, assentos, tipos de ingresso e comprador permanece preservado ao retornar.

## QA reproduzível do botão Voltar

Foi executado um teste automatizado com cliques reais no botão Voltar em todas as etapas. Os quatro cenários passaram: sessões → tela inicial, assentos → sessões, checkout → assentos e confirmação → checkout. A preservação também passou: um assento selecionado permaneceu no resumo ao retornar a sessões; dois assentos permaneceram selecionados ao voltar de checkout para assentos; e a confirmação retornou ao checkout com os dois itens do pedido preservados.

## Primeiro passe do redesenho editorial

O desktop apresentou boa hierarquia entre a narrativa do evento, a jornada de pré-venda e o radar de disponibilidade. No primeiro passe mobile, as novas grades mantiveram colunas desktop e comprimiram o texto em excesso. A próxima etapa corrige as seções para uma coluna, aumenta a área útil de leitura e reorganiza os módulos de informação para viewport estreita.

Após o refinamento, a validação mobile confirmou uma coluna de leitura para a narrativa, painel de lançamento, cards da jornada e radar de disponibilidade. Os CTAs ocupam a largura disponível e os blocos preservam espaçamento e contraste. A nova captura desktop confirmou que a hierarquia em duas colunas, a arte de fundo e a jornada de conversão permanecem intactas.

## Verificação pós-restauração comercial

Em 14 de agosto de 2026, o código local, os testes e o build confirmaram a restauração de R$ 51,28 para inteira e R$ 25,64 para meia-entrada. Contudo, duas cargas do checkout no domínio público ainda exibiram R$ 5,00/R$ 2,50 após o checkpoint `dd3024e8`. A publicação precisa ser inspecionada antes de considerar a restauração comercial concluída; nenhuma cobrança nova deve ser criada enquanto o domínio público não refletir os valores comerciais.

## Máscaras de dados do checkout

Em 14 de agosto de 2026, a entrada controlada do checkout foi validada com valores sintéticos. O CPF foi apresentado como `123.456.789-01` e o celular como `(12) 34567-8910`, com teclados numérico e telefônico indicados para dispositivos móveis. A normalização de dígitos no servidor permanece ativa antes do envio à AmploPay.

## Rolagem para pagamento

Em 14 de agosto de 2026, a passagem de assentos para pagamento foi acionada no fluxo de QA. O checkout foi exibido com o elemento `purchase-flow` posicionado no topo visível da viewport, removendo o comportamento anterior de manter o usuário no fim da página. As demais transições não foram alteradas.

## Regressão do funil após ajuste de rolagem

Em 14 de agosto de 2026, a regressão foi iniciada pela etapa de sessões, utilizando a seleção de QA com dois assentos planejados. A validação das transições subsequentes é registrada junto aos seus estados de tela, sem criar cobranças PIX.

A transição sessões→assentos foi acionada com sucesso no cenário de QA, preservando os dois lugares planejados. As rotas de retorno continuam em verificação visual após a atualização de estado da interface.

O retorno assentos→sessões foi acionado pelo botão Voltar e restaurou a sessão de 13:20, os dois ingressos planejados e os dois assentos no resumo. A regressão confirma que a nova rolagem para pagamento não alterou essas duas transições.

A tela de confirmação foi carregada no cenário de QA e o botão Voltar retornou corretamente ao checkout, exibindo novamente o formulário, a opção PIX e o resumo de dois assentos. Nenhuma cobrança foi criada durante essa regressão.

As regras de navegação passaram a ser exercitadas em teste automatizado: sessões→assentos, assentos→pagamento, todos os retornos contextuais e checkout→confirmação somente quando a cobrança PIX local fica aprovada. A suíte de validação passou com 21 testes, sem criar nova cobrança.

Em 14 de agosto de 2026, o cenário local exclusivo de QA `?screen=checkout&pixApproved=1` percorreu a transição real do checkout para a confirmação. A tela resultante exibiu o código `DD-QA-PAID`, o estado “Pagamento aprovado” e os dois assentos de QA, sem criar uma cobrança. O parâmetro é bloqueado no ambiente publicado.

No mesmo cenário, o botão Voltar da confirmação retornou ao checkout com os assentos A1 e A2, o resumo de R$ 102,56 e o código PIX de QA preservados. A etapa de checkout abriu no topo do fluxo, sem recarregar a página nem criar uma transação.

No domínio publicado, a mesma URL com `pixApproved=1` permaneceu no checkout normal, exibindo apenas a ação "Gerar código PIX". Não houve QR Code, confirmação automática nem cobrança criada, confirmando que a simulação está restrita ao ambiente local.

Após a correção da ordem de preenchimento do cenário local, o efeito de PIX aprovado passou a aguardar que os dados do comprador, assentos e total estejam prontos antes de criar o pagamento simulado. A confirmação resultante exibiu o e-mail `cliente@exemplo.com`, os assentos A1 e A2, o total de R$ 102,56 e o código `DD-QA-PAID`. O botão Voltar retornou ao checkout com o formulário preenchido, o PIX de QA e o resumo do pedido intactos; a guarda adicional impede que essa navegação seja imediatamente revertida para confirmação. A regressão integrada do funil foi concluída com todos os dados do pedido preservados.

## Recursos visuais locais

Em 17 de agosto de 2026, as cinco imagens/vídeo utilizados pelo site foram copiados para `client/public/assets/` e as referências foram alteradas para `/assets/...`. A verificação local retornou HTTP 200, os tipos MIME esperados e os tamanhos completos para todos os arquivos. O conjunto totaliza aproximadamente 1,82 MiB; o vídeo de abertura tem 705.816 bytes (0,67 MiB), tamanho adequado para permanecer no repositório neste estágio, com recomendação de medir carregamento em rede móvel antes da campanha.

## Sequência de abertura do hero

Em 17 de agosto de 2026, a camada de vídeo passou a permanecer invisível até o evento de reprodução efetiva; durante esse pré-carregamento, a arte estática também permanece oculta. A abertura foi conferida em desktop e em 390×844: o vídeo assumiu o hero antes da imagem estática, sem o flash anterior. O encerramento mantém o fade lento para a arte e o fallback de movimento reduzido segue exibindo diretamente a imagem. Tipos, 23 testes e build foram aprovados.
