# Diagnóstico TiDB na Vercel — 18 de agosto de 2026

## Consulta pública sem criação de cobrança

A consulta `presale.getPixPaymentStatus` foi executada no domínio oficial com o código artificial `CHECK-TIDB-READ-ONLY`. Ela **não criou cobrança PIX** e chegou à etapa de criação idempotente da tabela.

O retorno foi HTTP 500 com `Failed query: CREATE TABLE IF NOT EXISTS amplopayPixPayments`. Isso confirma que as variáveis TiDB foram lidas pela função publicada e que o bloqueio restante está na instrução DDL da tabela, não na ausência de `TIDB_*`.

## Acesso a logs

O navegador de diagnóstico foi direcionado à página de login da Vercel. O erro detalhado do TiDB só poderá ser visto com a sessão Vercel do proprietário ou por uma captura da área **Logs** do deployment de produção.

## Próxima ação

Adaptar a instrução `CREATE TABLE` à variante compatível do TiDB e voltar a executar a mesma consulta somente leitura após um novo deploy.
