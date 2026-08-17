# Guia de migração para ambiente e domínio externos

Este guia transfere o projeto **Avengers: Doomsday — Pré-venda** para uma hospedagem fora da Manus, preservando o checkout PIX da AmploPay. Ele foi preparado a partir do código atual e **não contém nem deve receber chaves reais**.

> **Regra de segurança:** envie as chaves ao novo ambiente exclusivamente pelo painel de segredos do provedor escolhido. Não coloque credenciais em Git, arquivos `.env` versionados, chat, tickets ou no prompt abaixo.

## Resumo executivo

As imagens e o vídeo já acompanham o repositório em `client/public/assets/`; portanto, eles não dependem mais do armazenamento da Manus. O PIX depende da AmploPay, do banco de dados e de um domínio HTTPS público. Para tornar toda a aplicação independente da Manus, o novo ambiente deve manter o fluxo público de pré-venda e remover ou substituir os módulos de template ainda ligados a OAuth, analytics, armazenamento e APIs internas da plataforma.[1] [2]

| Área | Situação ao migrar | Ação necessária |
|---|---|---|
| Imagens e vídeo | **Independente da Manus** | Mantenha `client/public/assets/` no Git. |
| PIX AmploPay | **Portável, com segredos** | Cadastrar segredos, novo callback HTTPS e webhook. |
| Banco de dados | **Precisa ser migrado** | Criar schema e, se houver vendas, transferir dados de cobranças. |
| Login/OAuth | **Ligado à Manus no template** | Remover ou substituir por autenticação própria se for utilizado. |
| Analytics | **Ligado à configuração atual** | Remover o script ou apontar para seu próprio Umami. |
| E-mail | **Ainda é demonstrativo** | Integrar provedor próprio antes de e-mails transacionais reais. |

## Informações a fornecer ao novo ambiente

Entregue ao responsável técnico somente as informações abaixo. Os valores secretos devem ser cadastrados por você diretamente no painel seguro do provedor.

| Item | Valor/formato a informar | Obrigatório | Observação |
|---|---|---:|---|
| Repositório GitHub | URL/organização do repositório | Sim | Clone a branch `main`. |
| Domínio final | `https://seu-dominio.com.br` | Sim | Deve ter HTTPS válido e sem caminho adicional. |
| URL do webhook | `https://seu-dominio.com.br/api/amplopay/webhook` | Sim | Cadastre na AmploPay após a publicação. |
| Banco MySQL/TiDB | URL de conexão segura | Sim | Não envie a URL em texto aberto; cadastre como segredo. |
| Chave pública AmploPay | Segredo `AMPLOPAY_PUBLIC_KEY` | Sim | Use a mesma conta AmploPay autorizada. |
| Chave secreta AmploPay | Segredo `AMPLOPAY_SECRET_KEY` | Sim | Nunca exponha no frontend. |
| E-mail transacional | Provedor, domínio remetente e chave | Para produção | O código atual só simula o envio de e-mail. |
| Analytics | Endpoint/ID do Umami próprio ou decisão de remover | Opcional | Não é requisito do PIX. |

## Variáveis de ambiente do novo servidor

Crie os valores no painel de segredos do novo provedor. O exemplo é apenas um modelo, sem credenciais reais.

```dotenv
# Runtime e banco
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://USUARIO:SENHA@HOST:3306/NOME_DO_BANCO
JWT_SECRET=gere-uma-chave-aleatoria-com-no-minimo-32-caracteres

# PIX AmploPay — variáveis privadas do servidor
AMPLOPAY_PUBLIC_KEY=CADASTRAR_NO_PAINEL_DE_SEGREDOS
AMPLOPAY_SECRET_KEY=CADASTRAR_NO_PAINEL_DE_SEGREDOS
AMPLOPAY_PIX_ENABLED=true
AMPLOPAY_CALLBACK_ORIGIN=https://seu-dominio.com.br
```

O código exige `AMPLOPAY_PIX_ENABLED=true` antes de criar cobranças e valida que a origem do navegador coincide com `AMPLOPAY_CALLBACK_ORIGIN`. O webhook resultante é montado como `/api/amplopay/webhook`.[3] [4]

> Mantenha `AMPLOPAY_PIX_ENABLED=false` até o domínio HTTPS estar publicado e o webhook estar cadastrado na AmploPay. Em seguida, faça uma cobrança de baixo valor autorizada por você para confirmar geração, recebimento do webhook e tela de confirmação.

## Banco de dados e continuidade das cobranças

O banco precisa conter a tabela `amplopayPixPayments`, que registra código do pedido, identificador, status, valor, token de webhook, dados do comprador e payload do provedor.[5] Se já houver cobranças pendentes ou vendas reais, faça uma migração segura do banco atual antes de desligar o ambiente antigo; caso contrário, um webhook recebido após a troca poderá atualizar somente a base antiga.

No novo ambiente, execute as migrações Drizzle antes de ativar o PIX. A equipe técnica deve revisar a SQL gerada contra um backup do banco e aplicar a migração no banco novo. A tabela `users` só é necessária se a autenticação for mantida ou substituída.

## Dependências externas: o que já está livre e o que deve ser substituído

| Recurso | Depende da Manus? | Estado e decisão para o novo ambiente |
|---|---:|---|
| Hero, logo, artes e vídeo | Não | Estão em `client/public/assets/` e são servidos por `/assets/...`. |
| Catálogo local de cinemas, sessões e assentos de demonstração | Não | Está no código. Continua sendo demonstrativo até integração oficial. |
| QR Code | Não | É gerado no cliente pela dependência `qrcode.react`. |
| AmploPay | Não, mas é externo | Requer as chaves, domínio HTTPS, banco e webhook corretos. |
| Google Fonts | Não, mas é externo | A página carrega fontes do Google. Hospede as fontes localmente se quiser eliminar essa dependência de rede. |
| E-mail de confirmação | Não está integrado | O endpoint atual retorna uma confirmação de demonstração; integre Resend, SES, Postmark ou equivalente para envio real.[6] |
| OAuth e sessão | Sim, no template atual | O servidor registra rotas OAuth e o frontend contém redirecionamento de login da Manus. Remova ou substitua antes da publicação externa independente.[1] [7] |
| Storage proxy e APIs Forge | Sim, no template atual | Não são necessários para as imagens atuais, mas os módulos de storage, IA, mapas, notificações e tarefas periódicas do template devem ser removidos ou substituídos se forem usados no futuro.[1] [2] |
| Analytics | Sim, na configuração atual | Remova a tag do `client/index.html` ou aponte `VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID` para um Umami controlado por você.[8] |

## Prompt pronto para o novo ambiente

Copie o texto abaixo e entregue ao agente ou à equipe responsável pela implantação. **Não inclua chaves no prompt.**

```text
Tenho um repositório React 19 + Vite + Express 4 + tRPC + Drizzle/MySQL chamado
"doomsday-presale-flow". Quero implantá-lo em um ambiente externo, sem depender da
infraestrutura da Manus, mantendo o checkout PIX real da AmploPay.

Objetivo:
1. Executar o site no domínio HTTPS: https://SEU-DOMINIO-AQUI
2. Manter a rota pública de webhook: /api/amplopay/webhook
3. Manter o PIX com criação de cobrança, persistência no MySQL/TiDB e confirmação
   automática somente após webhook validado.
4. Servir imagens e vídeo de client/public/assets por /assets, sem manus-storage.

Segredos que cadastrarei diretamente no painel seguro do ambiente, sem commit:
- DATABASE_URL
- JWT_SECRET
- AMPLOPAY_PUBLIC_KEY
- AMPLOPAY_SECRET_KEY
- AMPLOPAY_PIX_ENABLED=true (somente após cadastrar webhook)
- AMPLOPAY_CALLBACK_ORIGIN=https://SEU-DOMINIO-AQUI

Faça estas tarefas:
- Preserve server/amplopay.ts, server/amplopay-webhook.ts, server/routers.ts,
  drizzle/schema.ts e a tabela amplopayPixPayments.
- Aplique migrações Drizzle no banco novo antes de ativar pagamentos.
- Configure HTTPS, variáveis privadas de servidor e logs seguros sem CPF, telefone,
  código PIX, token de webhook ou chaves.
- Cadastre na AmploPay a URL https://SEU-DOMINIO-AQUI/api/amplopay/webhook.
- Remova ou substitua as dependências específicas da Manus que não são necessárias:
  OAuth/sessão da Manus, systemRouter, storageProxy, APIs Forge, analytics e o
  redirecionamento automático de login no cliente. A pré-venda atual é pública e
  não precisa de login para criar PIX.
- Não exponha AMPLOPAY_SECRET_KEY nem DATABASE_URL ao navegador.
- Substitua o e-mail de demonstração por um provedor transacional antes de vendas
  reais, mantendo os dados pessoais fora dos logs.
- Mantenha e execute pnpm check, pnpm test e pnpm build.
- Entregue um .env.example sem valores reais, instruções de deploy e um relatório
  das mudanças feitas.

Critérios de aceite:
- /assets/avengers-doomsday-hero.webp e o vídeo carregam no domínio novo.
- Uma criação de PIX autorizada gera QR/copia-e-cola.
- O webhook TRANSACTION_PAID atualiza o pedido no banco e abre a confirmação.
- O domínio antigo não é usado no callback, analytics, imagens ou login.
```

## Checklist de entrada em produção

| Ordem | Verificação |
|---:|---|
| 1 | Fazer backup do banco atual e, se aplicável, migrar as cobranças abertas. |
| 2 | Publicar o backend e o frontend no novo domínio HTTPS. |
| 3 | Cadastrar segredos no painel seguro, com `AMPLOPAY_PIX_ENABLED=false`. |
| 4 | Aplicar as migrações Drizzle no banco novo. |
| 5 | Configurar na AmploPay o webhook `https://seu-dominio.com.br/api/amplopay/webhook`. |
| 6 | Alterar `AMPLOPAY_CALLBACK_ORIGIN` para o domínio novo e habilitar `AMPLOPAY_PIX_ENABLED=true`. |
| 7 | Validar uma cobrança autorizada de teste, o webhook e a confirmação do pedido. |
| 8 | Remover chaves antigas do ambiente que deixará de operar e monitorar o novo webhook. |

## Referências internas

[1] `server/_core/index.ts` — registra OAuth e proxy de storage da Manus no servidor.

[2] `server/_core/env.ts` — lista variáveis de Forge/OAuth e de AmploPay presentes no template.

[3] `server/amplopay.ts` — valida as chaves e exige `AMPLOPAY_PIX_ENABLED=true` para criar cobranças.

[4] `server/routers.ts` — valida `AMPLOPAY_CALLBACK_ORIGIN` e constrói a URL do webhook.

[5] `drizzle/schema.ts` — define a tabela `amplopayPixPayments` persistida pelo checkout.

[6] `server/presale.ts` — implementa apenas o retorno demonstrativo de envio de e-mail.

[7] `client/src/_core/hooks/useAuth.ts` e `client/src/main.tsx` — contêm comportamento de OAuth/sessão da Manus.

[8] `client/index.html` — inclui a tag de analytics configurada por variáveis de ambiente.
