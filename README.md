# WebChat (React + Vite + Supabase)

Aplicação de chat em tempo real construída com React, TypeScript, Vite e Supabase.

## Principais Recursos

- Autenticação com email e senha (Supabase Auth)
- Perfis de usuário armazenados em `profiles`
- Mensagens em tempo real usando Supabase Realtime em `messages`
- Fallback de polling quando o Realtime não estiver ativo
- “Limpeza” visual: mensagens com mais de 1 minuto deixam de ser exibidas
- (Opcional) Política de DELETE para remover mensagens antigas do banco

## Tecnologias

- React 18 + TypeScript + Vite
- Supabase JavaScript Client
- TailwindCSS (estilização)

## Estrutura Relevante

- Componente de autenticação: [Auth.tsx](file:///c:/Users/caiob/Downloads/webchat/webchat-faculdade/src/components/Auth.tsx)
- Componente de chat (realtime + polling): [Chat.tsx](file:///c:/Users/caiob/Downloads/webchat/webchat-faculdade/src/components/Chat.tsx)
- Cliente Supabase: [supabase.ts](file:///c:/Users/caiob/Downloads/webchat/webchat-faculdade/src/lib/supabase.ts)
- SQL do esquema do banco: [migration SQL](file:///c:/Users/caiob/Downloads/webchat/webchat-faculdade/supabase/migrations/20260309192241_create_chat_schema.sql)

## Pré-requisitos

- Node.js LTS
- Projeto criado no Supabase (https://supabase.com/)
  - Copie o Project URL e a anon public key em Settings → API

## Configuração do Ambiente

Crie o arquivo `.env` dentro do diretório do projeto Vite (raiz deste app):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Importante:
- Use a “anon public key” (nunca a service role key no front-end).
- Reinicie o servidor de desenvolvimento após alterar o `.env`.

## Inicialização

```
npm install
npm run dev
```

Aplicação: http://localhost:5173/ (ou outra porta indicada).

## Banco de Dados (Supabase)

1) Aplique o esquema do chat:

- No painel do Supabase → SQL Editor → execute o conteúdo de:
  - [20260309192241_create_chat_schema.sql](file:///c:/Users/caiob/Downloads/webchat/webchat-faculdade/supabase/migrations/20260309192241_create_chat_schema.sql)

Esse script cria as tabelas `profiles` e `messages`, políticas RLS de leitura/insert, índices, e uma política opcional para permitir `DELETE` de mensagens com mais de 1 minuto.

2) Ative o Realtime para a tabela `messages`:

- Database → Replication → Realtime → habilite para `public.messages`
- (Opcional via SQL):

```
alter table public.messages replica identity full;
alter publication supabase_realtime add table public.messages;
```

3) Autenticação (desenvolvimento):

- Para evitar bloqueio por limite de emails, desative confirmações em:
  - Authentication → Providers → Email → desative “Email confirmations”

## Fluxo do App

1. Registro/Login: cria/usa conta e insere um registro em `profiles` na primeira vez.
2. Chat:
   - Carrega mensagens recentes (menos de 1 minuto) com `profiles` associados.
   - Assina eventos Realtime de INSERT/DELETE em `messages` para atualizações instantâneas.
   - Fallback: se o canal Realtime não estiver `SUBSCRIBED`, um polling periódico mantém a UI atualizada.
   - Limpeza visual: mensagens com mais de 1 minuto não são exibidas. Se a política de `DELETE` estiver ativa, o banco também remove mensagens antigas e o Realtime dispara o evento de remoção.

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run preview` — serve o build localmente
- `npm run typecheck` — checagem de tipos (TS)
- `npm run lint` — lint do código

## Solução de Problemas

- “No API key found in request” ou falha de autenticação:
  - Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` do projeto e reinicie o `npm run dev`.

- “Could not find the table 'public.profiles' in the schema cache”:
  - Execute o SQL do schema no Supabase (tabelas `profiles` e `messages`) e aguarde alguns segundos para o cache refletir.

- 429 “over_email_send_rate_limit” ao registrar:
  - Desative confirmações de email em Authentication → Providers → Email (ambiente de dev) ou aguarde a janela de rate limit.

- Realtime não atualiza automaticamente:
  - Habilite Realtime em Database → Replication → Realtime para `public.messages`.
  - Opcional via SQL: `alter table public.messages replica identity full;` e `alter publication supabase_realtime add table public.messages;`
  - Enquanto o Realtime não estiver ativo, o app usa polling para manter a lista atualizada.

- Mensagens não “somem” do banco:
  - A limpeza visual oculta mensagens com mais de 1 minuto na interface. Para remover do banco, mantenha a política de `DELETE` ativa no SQL.

## Segurança

- No front-end, use apenas a `anon public key`.
- Nunca exponha a chave de service role no cliente.

## Licença

Uso educacional/demonstração.

