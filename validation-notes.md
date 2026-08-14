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
