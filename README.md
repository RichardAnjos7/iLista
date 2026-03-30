# iList

PWA de listas de compras (Next.js + Supabase) com dashboard, tempo real e compartilhamento por link/QR.

## Estrutura

- `web/` — aplicativo Next.js 16 (App Router, Tailwind, PWA via `@ducanh2912/next-pwa`)
- `supabase/migrations/` — SQL inicial (tabelas, RLS, Realtime, RPCs da dashboard)
- `supabase/seed.sql` — categorias e produtos de exemplo

## Configuração

1. Crie um projeto em [Supabase](https://supabase.com) e execute o conteúdo de `supabase/migrations/20260330000000_ilist_init.sql` no **SQL Editor** (ou use a CLI do Supabase).
2. Rode `supabase/seed.sql` no mesmo editor para popular categorias e produtos.
3. Em **Authentication → URL Configuration**, adicione a URL do site (ex.: `http://localhost:3000`) e o redirect: `http://localhost:3000/auth/callback`.
4. Copie `web/.env.example` para `web/.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Desenvolvimento

```bash
cd web
npm install
npm run dev
```

Build de produção (webpack, necessário para o plugin PWA):

```bash
cd web
npm run build
npm start
```

## Funcionalidades implementadas

- Autenticação e-mail/senha (Supabase Auth) e callback `/auth/callback`
- Listas com itens (quantidade, preço unitário, subtotal e total em tempo real)
- Colaboração: código de compartilhamento, QR, rota pública `/lists/join/[code]` e RPC `join_list_by_code`
- Realtime em `list_items` e `shopping_lists`
- Supermercados próprios, histórico de preços ao concluir lista
- Dashboard: resumo do mês, ranking de produtos, variação de preço, comparação entre mercados, sugestão de economia, alertas de alta
- Produtos com favoritos, histórico de compras concluídas, navegação inferior mobile-first
- Banner de offline (base para fila de sincronização em `useOfflineSync`)

Substitua `public/icon-192.png` e `public/icon-512.png` por ícones reais (192×192 e 512×512) para instalação PWA adequada.
