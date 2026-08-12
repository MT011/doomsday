# Validação da abertura audiovisual

Foram verificadas as versões desktop (1280×720) e mobile (390×844) do hero após a transição programada. Em desktop, a logo de *Avengers: Doomsday* substitui o lockup textual no cabeçalho e o hero final apresenta o Doutor Destino sem a chamada “Uma experiência Marvel Studios” ou o ícone de estrela.

Em mobile, a logo principal permanece centralizada acima do texto, enquanto a arte do Doutor Destino fica centralizada e visível até a região da capa. A nova sobreposição inferior preserva legibilidade do texto e dos CTAs. O vídeo enviado é iniciado em modo silencioso e incorporado antes da arte final, com fade após aproximadamente 2,2 segundos no mobile e 3 segundos no desktop; usuários com preferência de redução de movimento seguem diretamente para a arte estática.

O modo de inspeção `?intro=1` foi capturado em desktop e mobile. As capturas mostraram um quadro real do vídeo de abertura ocupando a área antes reservada ao Doutor Destino, com a logo, a navegação, a cópia e os CTAs mantendo contraste suficiente sobre a sequência. O caminho normal não usa esse parâmetro e aplica o fade para a arte estática dentro dos tempos definidos.

No refinamento final, a reprodução foi configurada na velocidade nativa do arquivo e a transição para a arte estática foi ligada ao evento de término do vídeo. O fade usa 2,8 segundos para revelar gradualmente o Doutor Destino. Capturas em desktop e mobile confirmaram o novo selo “PRÉ-VENDA · ABERTA AGORA” com contraste e hierarquia acima da logo durante a sequência em vídeo.

No ajuste de posicionamento, o selo foi movido para o topo central do hero e refeito em duas linhas: “PRÉ-VENDA” e “ABERTA”. As capturas em desktop e mobile confirmaram a tipografia branca, mais pesada, a centralização e a separação segura em relação ao logotipo do cabeçalho e à logo principal do filme.

Na simplificação seguinte, a logo superior esquerda foi removida. As capturas em desktop e mobile confirmaram que a composição ficou menos repetitiva e que o selo central, ligeiramente ampliado, permanece como o principal elemento de chamada à pré-venda sem competir com a logo do filme.

O selo “PRÉ-VENDA ABERTA” foi deslocado 14 px para cima no desktop e no mobile. As capturas finais confirmaram a centralização, o contraste branco e a distância segura da logo principal do filme em ambas as larguras.

A tipografia dos botões “COMPRAR INGRESSOS” e “CONHEÇA O FILME”, da navegação “O FILME”/“COMPRAR INGRESSOS” e do status “PRÉ-VENDA AO VIVO” foi alinhada à Barlow Condensed pesada usada no selo. As capturas desktop/mobile confirmaram consistência visual e leitura adequada.

O selo recebeu gradiente verde mais intenso, brilho verde e dois detalhes quadrados nas extremidades da linha superior. O CTA “COMPRAR INGRESSOS” foi convertido para branco com hover levemente esverdeado. As capturas desktop/mobile confirmaram contraste, leitura e coerência com a identidade Doomsday.

O botão “COMPRAR INGRESSOS” foi revertido visualmente para o gradiente verde Doomsday, agora com texto e ícone brancos. As capturas desktop/mobile confirmaram o contraste e a coerência com o selo “PRÉ-VENDA ABERTA”.

A validação desktop de `/?screen=sessions` e `/?screen=seats` confirmou a aplicação do verde Doomsday escuro nos indicadores de fluxo, ícones, resumo lateral, sessão ativa e estados dos assentos. Assentos disponíveis passaram a usar verde profundo; assentos selecionados usam um tom verde ligeiramente mais destacado, mantendo diferenciação visual.

A validação mobile das páginas de sessões e assentos confirmou que os indicadores ativos, ícones, campos e assentos usam o verde Doomsday escuro sem prejudicar a leitura. O mapa continua navegável em viewport estreita e o estado selecionado permanece distinguível do disponível.

A QA ampliada em desktop e mobile cobriu `/?screen=sessions`, `/?screen=seats`, `/?screen=checkout` e `/?screen=confirmation`. A nova paleta escura permanece consistente nas telas de localização e pagamento; a confirmação mantém contraste; e o mapa diferencia assento disponível de selecionado por gradiente, borda clara, texto branco e brilho controlado.
