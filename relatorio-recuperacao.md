# Relatório de recuperação — Avengers: Doomsday

**Data:** 25 de agosto de 2026
**Projeto:** site de pré-venda cinematográfica de *Avengers: Doomsday*

## Resultado da recuperação

O projeto está preservado no [repositório GitHub oficial do projeto][1]. A branch `main` foi clonada e reproduzida localmente sem perda de estrutura. O histórico remoto apresenta 63 commits, com checkpoints recentes relacionados ao fluxo PIX, persistência, máscaras de checkout, Meta Pixel e correções de compatibilidade com publicação.

A aplicação também permanece publicada e acessível em [doomsday-tau.vercel.app][2]. A página inicial carrega com a identidade visual cinematográfica já definida: hero com vídeo/imagem, logo do filme, tema escuro com verde Doomsday, data de estreia em 18 de dezembro de 2026, chamadas para compra e seções de evento, formatos, cinemas e disponibilidade.

## Validação técnica

| Verificação | Resultado |
| --- | --- |
| Instalação por lockfile | Aprovada com `pnpm install --frozen-lockfile` |
| Testes automatizados | 14 arquivos aprovados; 38 testes aprovados; 1 teste externo ignorado por ausência de credenciais reais |
| TypeScript | Aprovado com `pnpm check` |
| Build de produção | Aprovado com `pnpm build` |
| Execução local | Aprovada em `http://localhost:3000/` |
| Segurança de credenciais | Nenhum arquivo `.env` rastreado; os testes usaram apenas valores temporários em memória |

Os avisos do build não bloquearam a aplicação. Eles se referem às variáveis opcionais de analytics não configuradas neste ambiente, ao script externo de analytics sem `type="module"` e ao tamanho de um chunk JavaScript acima de 500 kB. Esses pontos podem ser tratados como melhoria técnica, mas não indicam perda do projeto.

## O que preciso para continuar

O código está pronto para retomada. Para iniciar uma nova alteração, basta informar o objetivo prioritário em linguagem direta, por exemplo: melhorar o design, corrigir alguma tela, revisar o checkout PIX, conectar dados reais de cinemas e sessões, trocar o domínio, preparar a publicação ou revisar a operação de pré-venda. Se houver um problema visual ou funcional específico, um print ou uma descrição do caminho para reproduzi-lo também será suficiente.

Não é necessário reenviar o projeto nem fazer backup adicional neste momento; o repositório GitHub já funciona como ponto de recuperação. Para qualquer operação que envolva credenciais, pagamentos reais ou publicação em produção, serão solicitadas apenas as informações e confirmações necessárias no momento apropriado.

## Referências

[1]: https://github.com/MT011/doomsday "Repositório GitHub do projeto Doomsday"
[2]: https://doomsday-tau.vercel.app/ "Versão publicada do site Doomsday"
