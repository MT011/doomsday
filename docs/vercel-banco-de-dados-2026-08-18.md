# Vercel e banco de dados — decisão de infraestrutura

## Constatação

A Vercel não oferece mais o antigo **Vercel Postgres** para novos projetos. A documentação atual informa que ele foi descontinuado e que novos projetos usam integrações externas de Postgres pelo Marketplace, como Neon. A Vercel também oferece Blob e Global Config, mas são produtos de armazenamento/configuração e não substituem um banco relacional transacional para pagamentos PIX.

## Compatibilidade com este projeto

O checkout PIX atual usa `drizzle-orm/mysql2`, `mysql2` e tabelas Drizzle em dialeto MySQL. Por isso, o TiDB foi escolhido: ele fala o protocolo MySQL e preserva o código, o esquema e os testes já existentes. Migrar para um provedor Postgres integrado à Vercel exigiria trocar o driver, reescrever o esquema/migrações e revalidar toda a persistência e o webhook antes de uma cobrança real.

## Recomendação

Manter o TiDB já conectado é o caminho de menor risco e menor trabalho. A divergência atual do domínio personalizado da Vercel é independente do banco TiDB. Antes de uma migração, é necessário resolver o vínculo da implantação que atende `www.prevendadoomsday.com.br`.

## Referências

[1] Vercel, [Postgres on Vercel](https://vercel.com/docs/postgres).

[2] Vercel, [Storage overview](https://vercel.com/docs/storage).
