# Diagnóstico TiDB na Vercel — 18 de agosto de 2026

## Consulta pública sem criação de cobrança

A consulta `presale.getPixPaymentStatus` foi executada no domínio oficial com o código artificial `CHECK-TIDB-READ-ONLY`. Ela **não criou cobrança PIX** e chegou à etapa de criação idempotente da tabela.

O retorno foi HTTP 500 com `Failed query: CREATE TABLE IF NOT EXISTS amplopayPixPayments`. Isso confirma que as variáveis TiDB foram lidas pela função publicada e que o bloqueio restante está na instrução DDL da tabela, não na ausência de `TIDB_*`.

## Acesso a logs

O navegador de diagnóstico foi direcionado à página de login da Vercel. O erro detalhado do TiDB só poderá ser visto com a sessão Vercel do proprietário ou por uma captura da área **Logs** do deployment de produção.

## Próxima ação

Adaptar a instrução `CREATE TABLE` à variante compatível do TiDB e voltar a executar a mesma consulta somente leitura após um novo deploy.

## Validação concluída

Após publicar a inicialização com o banco exclusivo `doomsday_presale` e executar um novo deployment de Production, a mesma consulta somente leitura retornou `Cobrança PIX não encontrada.`. Esse é o resultado esperado para o código artificial consultado: a tabela foi preparada, a consulta alcançou o TiDB e **nenhuma cobrança PIX foi criada**.

## Divergência de implantação posterior

O commit `70a21b11`, que inclui a consulta `presale.getPixReadiness`, está confirmado na branch `main` do GitHub e recebeu status Vercel de deployment concluído. Porém, o domínio oficial ainda respondeu `No procedure found` para essa nova rota. A evidência indica que o domínio de produção está vinculado a outra implantação ou ambiente Vercel, e não que a atualização deixou de chegar ao GitHub.

O painel Vercel associado ao deployment exige sessão do proprietário para confirmar o ambiente e a associação de domínio.

## Restauração autorizada da produção

Com autorização explícita do proprietário, a branch `main` foi restaurada para o commit validado `7905e9c8`. A branch divergente anterior foi preservada no GitHub como `backup/main-before-restore-20260819`, sem perda do estado remoto. A Vercel reconheceu o commit restaurado como deployment concluído; a rota pública ainda exige confirmação HTTP direta após a propagação do alias de domínio.

## Domínio oficial promovido

O deployment `7905e9c` foi promovido manualmente na Vercel após confirmação do proprietário. A plataforma confirmou a promoção e associou `www.prevendadoomsday.com.br` e `doomsday-tau.vercel.app` a essa versão validada. A consulta HTTP direta para a rota pública retornou HTTP 200 após a promoção; a resposta tRPC ainda será verificada em formato JSON no próximo passo, sem criar cobrança.
