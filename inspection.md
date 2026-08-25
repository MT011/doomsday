# Inspeção inicial — Avengers: Doomsday

Data da inspeção: 2026-08-25.

## Repositório

- URL: https://github.com/MT011/doomsday
- Branch inspecionada: `main`
- Último commit remoto observado: `6f1fadd` — evento padrão Purchase do Meta Pixel adicionado ao fluxo de confirmação de PIX.
- Histórico visível: 63 commits.
- O repositório é público e contém frontend React/Vite, backend Express/tRPC, integração PIX AmploPay, persistência Drizzle/Postgres/Supabase, testes Vitest e documentação operacional.
- Diretórios principais: `client`, `server`, `api`, `shared`, `drizzle`, `docs`.
- Arquivos de configuração importantes: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `vercel.json`, `tsconfig.json`, `drizzle.config.ts`.
- O projeto usa TypeScript, React 19, Vite, Tailwind 4, Express, tRPC, Drizzle, Vitest e `pnpm`.
- Não foi encontrado arquivo `.env` rastreado. Há nomes de arquivos contendo a palavra `secret` apenas em uma migração SQL e em um teste de credenciais, não como evidência de segredo exposto.

## Estado publicado

- URL observada: https://doomsday-tau.vercel.app/
- Título: `Avengers: Doomsday — Pré-venda`.
- A página inicial carrega e mostra o hero cinematográfico, chamada de pré-venda, data de estreia em 18 DEZ 2026, seções editoriais, catálogo de cinemas e CTA para compra.
- O conteúdo publicado indica 441 cinemas no catálogo e 27 estados disponíveis.
- O fluxo público informa que sessões, disponibilidade e pagamentos aguardam integração oficial; o repositório, entretanto, contém implementação e documentação de PIX AmploPay para o fluxo operacional.
- A captura visual inicial mostra a identidade escura/cinematográfica com verde Doomsday, logo Avengers: Doomsday, vídeo/imagem de hero e navegação para `O filme` e `Comprar ingressos`.

## Próxima decisão necessária

O código e o deployment estão preservados. Antes de editar, é necessário definir o próximo objetivo concreto: recuperar/publicar em domínio oficial, corrigir algum erro, alterar o design/conteúdo, testar o checkout PIX, conectar dados reais de cinemas/sessões, ou preparar a operação comercial.

## Validação local

- `pnpm install --frozen-lockfile` concluiu sem erro.
- Com variáveis temporárias de ambiente, a suíte concluiu com 14 arquivos de teste aprovados, 38 testes aprovados e 1 teste externo ignorado por não haver credencial real nesta sessão.
- `pnpm check` concluiu sem erro.
- `pnpm build` concluiu sem erro, gerando o bundle frontend e `dist/index.js`.
- O build emite apenas avisos já conhecidos sobre as variáveis opcionais de analytics (`VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID`), sobre o script externo sem `type="module"` e sobre um chunk JavaScript acima de 500 kB.
- A versão local em `http://localhost:3000/` carrega o mesmo conteúdo principal da versão publicada: hero, logo, CTAs, seções editoriais, catálogo e indicação de pré-venda.

## Interação de navegador

- Uma tentativa de clicar no CTA principal local encontrou um snapshot obsoleto de elementos.
- Ao atualizar a visualização, a sessão do navegador estava em `about:blank`; isso indica reset da sessão do navegador, não uma falha observada na aplicação. A validação por carregamento direto em `http://localhost:3000/` já havia sido bem-sucedida.

## Decisão futura registrada

O proprietário informou que pretende substituir o gateway/adquirente de PIX atual, AmploPay, pela Cakto, principalmente por considerar baixa a aprovação atual. Esta é uma intenção futura; nenhum código, ambiente, credencial, cobrança ou deployment foi alterado. A migração deverá começar pela documentação oficial da Cakto e pela comparação do contrato atual de criação de cobrança, QR Code, webhook, estados de pagamento, idempotência e confirmação do pedido.

## Migração Cakto — estado local em 25/08/2026

Foi implementado localmente um adaptador Cakto com OAuth2, cache de token em memória, catálogo de ofertas por valor, cobrança Pix com idempotência, profiling antifraude no navegador, webhook `/api/cakto/webhook`, seleção por `PIX_PROVIDER` e manutenção da rota AmploPay para rollback. O frontend mantém a seleção dinâmica de ingressos e envia o total calculado pelo servidor.

Validação local: `pnpm check` aprovado; 16 arquivos de teste, 48 testes aprovados e 1 ignorado; `pnpm build` aprovado. A geração Drizzle não foi aplicada porque a sessão local não possui `POSTGRES_URL`; nenhum banco ou cobrança foi alterado. A migração SQL deve ser gerada/aplicada somente com a conexão privada correta do Supabase/TiDB/Vercel.

A API Cakto exige `offerId` de uma oferta existente e uma referência de profiling antifraude, por isso a implementação cria/reutiliza ofertas por total. Antes da produção, é obrigatório confirmar no painel Cakto o `CAKTO_PRODUCT_ID`, escopos `payments` e `offers`, o segredo do webhook e se o produto/conta aceita a operação de pré-venda de ingressos.

## Vercel — preparação da configuração Cakto

Em 25/08/2026, o projeto `mt011s-projects/doomsday` foi aberto na Vercel. A produção está ligada ao repositório `MT011/doomsday`, branch `main`, e o domínio `www.prevendadoomsday.com.br` está associado. A área Environment Variables mostra `DATABASE_URL`, variáveis atuais da AmploPay e várias variáveis Supabase provisionadas pela integração Supabase.

O formulário `Add Environment Variable` foi aberto apenas para preparação. Nenhuma variável nova foi salva ainda e nenhum segredo Cakto foi inserido. A estratégia segura é cadastrar primeiro o `CAKTO_API_CLIENT_SECRET` diretamente pelo usuário no campo Secret, sem enviá-lo no chat; os demais valores não secretos podem ser adicionados separadamente. A ativação de `PIX_PROVIDER=cakto` deve ocorrer somente após webhook, código e migração de tabela estarem prontos.

Atualização: `CAKTO_API_CLIENT_SECRET` foi confirmado na Vercel como variável do tipo Secret em **Production**; o valor não foi lido nem registrado. O formulário de nova variável está aberto como **Config**, também em Production, e `CAKTO_API_CLIENT_ID` foi preenchido com o Client ID fornecido pelo usuário, mas ainda não foi salvo junto com as demais configurações.

No mesmo formulário, também foram preenchidos `CAKTO_API_CLIENT_ID` e `CAKTO_PRODUCT_ID` para Production; o botão de salvar do conjunto ainda não foi acionado.

A configuração `PIX_CALLBACK_ORIGIN=https://www.prevendadoomsday.com.br` também foi preenchida no conjunto de Production; o provedor de pagamentos segue inalterado e nenhum deploy foi iniciado.

Também foram preenchidas no mesmo conjunto `CAKTO_PIX_ENABLED=false` e `VITE_CAKTO_SDK_CLIENT_ID` com o Client ID público. O conjunto ainda aguarda um único salvamento na Vercel; `PIX_PROVIDER` não foi cadastrado para preservar a AmploPay como provedor efetivo até a validação.

Em seguida, o conjunto foi salvo com sucesso na Vercel: `VITE_CAKTO_SDK_CLIENT_ID`, `CAKTO_API_CLIENT_ID`, `CAKTO_PRODUCT_ID`, `PIX_CALLBACK_ORIGIN` e `CAKTO_PIX_ENABLED=false`, todos em Production. O painel Cakto também foi reaberto autenticado em `app.cakto.com.br/dashboard/home`; não houve criação de webhook ou cobrança.

No painel, o menu Integrações foi aberto e confirmou a opção **Webhooks** em `/dashboard/webhooks`; o próximo passo é apenas configurar o callback, sem ativar cobranças nem publicar o código.

O formulário de novo webhook foi aberto. Foram preenchidos o nome `Doomsday PIX — aprovação de compra` e a URL `https://www.prevendadoomsday.com.br/api/cakto/webhook`. O cadastro ainda não foi salvo; produto, eventos, tipo de disparo e chave secreta continuam pendentes.

No formulário, a busca do produto foi aberta e recebeu o termo `MOVIE`; a Cakto mostrou estado de carregamento para a lista filtrada, portanto ainda não houve seleção nem salvamento.

Após o carregamento, a opção `MOVIE | Avengers` foi selecionada com sucesso no formulário. O webhook continua sem tipo de disparo, segredo e salvamento. O evento `Compra aprovada` foi selecionado com sucesso; a lista ainda está aberta para adicionar `Compra recusada`, `Reembolso` e `Chargeback`.

Os quatro eventos foram então selecionados no formulário: `Compra aprovada`, `Compra recusada`, `Reembolso` e `Chargeback`. O cadastro ainda não foi salvo; faltam tipo de disparo e chave secreta.

Os eventos continuam selecionados e a lista foi fechada para permitir a escolha do tipo de disparo. Nenhuma chave secreta foi digitada ou exposta.

A configuração do webhook Cakto agora está com o produto `MOVIE | Avengers`, eventos `Compra aprovada`, `Compra recusada`, `Reembolso` e `Chargeback`, e tipo de disparo **Agrupado**, adequado ao carrinho que gera uma única cobrança PIX. A Cakto exibiu um modelo de payload de exemplo, mas ele não foi tratado como dado real. A chave do webhook foi gerada sem ser registrada no projeto, inserida no formulário protegido e o webhook foi salvo como ativo.

A mesma chave foi cadastrada na Vercel como `CAKTO_WEBHOOK_SECRET` do tipo Secret em Production. A Vercel informou que é necessário um novo deployment para a mudança entrar em vigor.

O webhook ficou ativo na Cakto e `CAKTO_WEBHOOK_SECRET` foi cadastrado em Production como Secret. A tentativa de abrir diretamente `/dashboard/cakto-api` após retornar ao painel exibiu uma página em branco/about:blank, então a conferência de escopos deverá ser feita navegando primeiro pela home autenticada da Cakto. Ao reabrir a home, a sessão redirecionou para o login SSO da Cakto; não houve alteração em variáveis, webhook ou pagamentos nesta tentativa.

O webhook segue ativo e `CAKTO_WEBHOOK_SECRET` segue salvo em Production na Vercel. A validação dos escopos da chave nova permanece pendente até a sessão Cakto ser reautenticada. A sessão foi reautenticada pelo usuário e a home está disponível. O primeiro clique na aba Integrações recarregou a home sem abrir o submenu; será usado o botão interno de expansão, sem alteração de configurações. O botão interno foi usado e o submenu agora exibe `Apps`, `Webhooks` e `Cakto API`; nenhum dado foi alterado.

A tela autenticada de `Cakto API` abriu corretamente, mas a tabela de chaves ainda aparece em estado de carregamento/skeleton na primeira inspeção. Nenhum segredo foi exposto e nenhuma configuração foi alterada. A tabela carregou e identificou `MOVIE-DOOMSDAY-PROD` pelo Client ID informado; o detalhe `Escopos (2)` confirma apenas **Escrita** e **Ofertas**. O escopo **Pagamentos** está ausente, portanto essa chave ainda não é suficiente para o endpoint de cobrança PIX. O webhook e as variáveis protegidas permanecem intactos. O menu de escopos foi fechado sem alterações. A inspeção da linha de ações indica que a primeira ação é a edição e a segunda é exclusão. A primeira ação foi aberta, mas o modal `Editar Chave API` permanece carregando sem mostrar campos; nenhuma permissão ou segredo foi alterado. `CAKTO_PIX_ENABLED` permanece `false`, `PIX_PROVIDER` ainda não foi definido, o código ainda não foi publicado e a AmploPay segue como fallback.

Após a correção do payload agrupado, a suíte local passou com 16 arquivos, 50 testes aprovados e 1 teste externo ignorado, usando somente valores temporários para os testes históricos da AmploPay. No painel Cakto, o modal de edição mostrou `Escrita`, `Ofertas` e `Pagamentos` marcados; a alteração foi tentada, mas mesmo após atualizar a página o resumo da tabela continua `Escopos (2)` e lista apenas `Escrita` e `Ofertas`. O modal mostrou `Pagamentos` marcado, porém a Cakto não refletiu essa permissão no resumo; por segurança, a chave não será considerada apta para cobrança até uma verificação por token ou nova chave com o escopo explicitamente concedido. Após atualizar a página e reabrir a edição, o modal continua mostrando `Escrita`, `Ofertas` e `Pagamentos` marcados, enquanto o resumo permanece `Escopos (2)` e lista os dois primeiros; isso aparenta ser uma inconsistência de exibição da Cakto. A chave será validada também por uma chamada autenticada antes de habilitar o PIX.

O GitHub agora reconhece a conta proprietária `MT011` no repositório exato `MT011/doomsday`. A tentativa de consulta somente leitura à API REST em `api.github.com` a partir da página foi bloqueada por CORS, sem criar branch nem alterar o repositório; a publicação seguirá pelo fluxo web autenticado do próprio GitHub ou permanecerá local até haver um caminho seguro.

A conta proprietária `MT011` criou no GitHub a branch `cakto-migration-validation` a partir da `main`. Uma primeira fila de upload foi limpa antes do commit porque a tela de upload na raiz reduziria arquivos aninhados a nomes de raiz; nenhum desses itens foi gravado no repositório. O próximo upload será feito navegando para cada diretório correto.

A branch `cakto-migration-validation` recebeu o primeiro commit remoto `318f360`, com `client/index.html` e apenas o carregamento do SDK público Cakto. O GitHub confirmou que a branch está uma commit à frente da `main`; nenhum arquivo de cobrança ou segredo foi enviado nesse commit.
