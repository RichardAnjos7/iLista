-- iList: schema inicial + RLS + funções da dashboard + Realtime
-- Execute no SQL Editor do Supabase ou via CLI: supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Usuário')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Categorias e produtos
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_read_authenticated" on public.categories
  for select to authenticated using (true);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  unit text not null default 'un',
  category_id uuid references public.categories (id) on delete set null,
  barcode text,
  is_global boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_name_idx on public.products (name);

alter table public.products enable row level security;

create policy "products_read_authenticated" on public.products
  for select to authenticated using (true);

create policy "products_insert_own" on public.products
  for insert to authenticated with check (created_by = auth.uid());

create policy "products_update_own" on public.products
  for update to authenticated using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Supermercados
-- ---------------------------------------------------------------------------
create table public.supermarkets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index supermarkets_user_id_idx on public.supermarkets (user_id);

alter table public.supermarkets enable row level security;

create policy "supermarkets_all_own" on public.supermarkets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Listas
-- ---------------------------------------------------------------------------
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  share_code text unique,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopping_lists_owner_idx on public.shopping_lists (owner_id);
create index shopping_lists_share_code_idx on public.shopping_lists (share_code);

alter table public.shopping_lists enable row level security;

create table public.list_collaborators (
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

alter table public.list_collaborators enable row level security;

create policy "collab_select_if_member" on public.list_collaborators
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.owner_id = auth.uid()
    )
  );

create policy "collab_insert_owner" on public.list_collaborators
  for insert to authenticated with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.owner_id = auth.uid()
    )
  );

create or replace function public.user_can_access_list(list_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shopping_lists sl
    where sl.id = list_uuid
      and (
        sl.owner_id = auth.uid()
        or exists (
          select 1 from public.list_collaborators lc
          where lc.list_id = sl.id and lc.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.join_list_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lid uuid;
begin
  if code is null or length(trim(code)) = 0 then
    raise exception 'Código inválido';
  end if;
  select id into lid
  from public.shopping_lists
  where share_code = trim(code)
    and status = 'active';
  if lid is null then
    raise exception 'Lista não encontrada';
  end if;
  if exists (
    select 1 from public.shopping_lists sl
    where sl.id = lid and sl.owner_id = auth.uid()
  ) then
    return lid;
  end if;
  insert into public.list_collaborators (list_id, user_id, role)
  values (lid, auth.uid(), 'editor')
  on conflict (list_id, user_id) do nothing;
  return lid;
end;
$$;

create policy "lists_select_access" on public.shopping_lists
  for select to authenticated using (public.user_can_access_list(id));

create policy "lists_insert_own" on public.shopping_lists
  for insert to authenticated with check (owner_id = auth.uid());

create policy "lists_update_access" on public.shopping_lists
  for update to authenticated using (public.user_can_access_list(id));

create policy "lists_delete_owner" on public.shopping_lists
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Itens
-- ---------------------------------------------------------------------------
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2),
  checked boolean not null default false,
  added_by uuid references public.profiles (id) on delete set null,
  checked_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index list_items_list_id_idx on public.list_items (list_id);

alter table public.list_items enable row level security;

create policy "items_all_if_list_access" on public.list_items
  for all to authenticated
  using (public.user_can_access_list(list_id))
  with check (public.user_can_access_list(list_id));

create policy "profiles_select_co_list" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.list_items li
      where li.added_by = profiles.id
        and public.user_can_access_list(li.list_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Favoritos
-- ---------------------------------------------------------------------------
create table public.favorite_products (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.favorite_products enable row level security;

create policy "favorites_own" on public.favorite_products
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Histórico de preços
-- ---------------------------------------------------------------------------
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supermarket_id uuid references public.supermarkets (id) on delete set null,
  price numeric(12, 2) not null,
  recorded_at timestamptz not null default now(),
  list_id uuid references public.shopping_lists (id) on delete set null
);

create index price_history_product_recorded_idx on public.price_history (product_id, recorded_at desc);
create index price_history_supermarket_idx on public.price_history (supermarket_id, recorded_at desc);

alter table public.price_history enable row level security;

create policy "price_history_select_own_lists" on public.price_history
  for select to authenticated using (
    list_id is null
    or exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.owner_id = auth.uid()
    )
  );

create policy "price_history_insert_own" on public.price_history
  for insert to authenticated with check (
    list_id is null
    or exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and public.user_can_access_list(sl.id)
    )
  );

-- ---------------------------------------------------------------------------
-- updated_at em listas e itens
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shopping_lists_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

create trigger list_items_updated_at
  before update on public.list_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime (Supabase)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.list_items;
alter publication supabase_realtime add table public.shopping_lists;

alter table public.list_items replica identity full;
alter table public.shopping_lists replica identity full;

-- ---------------------------------------------------------------------------
-- RPCs — Dashboard
-- ---------------------------------------------------------------------------
create or replace function public.get_most_bought_products(p_limit int default 10)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  unit text,
  times_bought bigint,
  last_price numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.name,
    coalesce(p.brand, '') as brand,
    p.unit,
    count(li.id) as times_bought,
    (
      select ph.price
      from public.price_history ph
      where ph.product_id = p.id
      order by ph.recorded_at desc
      limit 1
    ) as last_price
  from public.list_items li
  join public.products p on p.id = li.product_id
  join public.shopping_lists sl on sl.id = li.list_id
  where sl.owner_id = auth.uid()
    and sl.status = 'completed'
  group by p.id, p.name, p.brand, p.unit
  order by times_bought desc
  limit coalesce(p_limit, 10);
$$;

create or replace function public.get_price_variations(p_limit int default 15)
returns table (
  product_id uuid,
  product_name text,
  current_price numeric,
  previous_price numeric,
  variation_pct numeric,
  direction text
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked as (
    select
      ph.product_id,
      ph.price,
      row_number() over (partition by ph.product_id order by ph.recorded_at desc) as rn
    from public.price_history ph
    join public.shopping_lists sl on sl.id = ph.list_id
    where sl.owner_id = auth.uid()
  ),
  pairs as (
    select
      c.product_id,
      c.price as current_price,
      p.price as previous_price
    from ranked c
    join ranked p on p.product_id = c.product_id and p.rn = c.rn + 1
    where c.rn = 1
  )
  select
    pr.id as product_id,
    pr.name as product_name,
    pairs.current_price,
    pairs.previous_price,
    round(
      ((pairs.current_price - pairs.previous_price) / nullif(pairs.previous_price, 0) * 100)::numeric,
      1
    ) as variation_pct,
    case
      when pairs.current_price > pairs.previous_price then 'up'
      when pairs.current_price < pairs.previous_price then 'down'
      else 'flat'
    end as direction
  from pairs
  join public.products pr on pr.id = pairs.product_id
  where pairs.current_price is distinct from pairs.previous_price
  order by abs(pairs.current_price - pairs.previous_price) desc
  limit coalesce(p_limit, 15);
$$;

create or replace function public.compare_supermarket_prices()
returns table (
  supermarket_id uuid,
  supermarket_name text,
  trip_count bigint,
  avg_total numeric,
  last_total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with totals as (
    select
      sl.id as list_id,
      sl.supermarket_id,
      sm.name as supermarket_name,
      coalesce(sum(li.quantity * coalesce(li.unit_price, 0)), 0)::numeric(12, 2) as list_total
    from public.shopping_lists sl
    left join public.supermarkets sm on sm.id = sl.supermarket_id
    join public.list_items li on li.list_id = sl.id
    where sl.owner_id = auth.uid()
      and sl.status = 'completed'
      and sl.supermarket_id is not null
    group by sl.id, sl.supermarket_id, sm.name
  ),
  by_sm as (
    select
      supermarket_id,
      max(supermarket_name) as supermarket_name,
      count(*)::bigint as trip_count,
      avg(list_total)::numeric(12, 2) as avg_total
    from totals
    group by supermarket_id
  )
  select
    b.supermarket_id,
    b.supermarket_name,
    b.trip_count,
    b.avg_total,
    (
      select t.list_total
      from totals t
      where t.supermarket_id = b.supermarket_id
      order by t.list_id desc
      limit 1
    ) as last_total
  from by_sm b
  order by b.avg_total asc nulls last;
$$;

create or replace function public.get_monthly_stats()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with month_lists as (
    select sl.id, sl.completed_at
    from public.shopping_lists sl
    where sl.owner_id = auth.uid()
      and sl.status = 'completed'
      and sl.completed_at is not null
      and sl.completed_at >= date_trunc('month', now())
  ),
  totals as (
    select coalesce(sum(li.quantity * coalesce(li.unit_price, 0)), 0)::numeric(12, 2) as month_total
    from public.list_items li
    where li.list_id in (select id from month_lists)
  ),
  trip as (
    select count(*)::int as trips from month_lists
  ),
  last_purchase as (
    select sl.completed_at
    from public.shopping_lists sl
    where sl.owner_id = auth.uid() and sl.status = 'completed' and sl.completed_at is not null
    order by sl.completed_at desc
    limit 1
  ),
  avg_per_trip as (
    select
      case
        when (select trips from trip) > 0
        then (select month_total from totals) / (select trips from trip)
        else 0::numeric
      end as avg_purchase
  )
  select json_build_object(
    'month_total', (select month_total from totals),
    'trips_this_month', (select trips from trip),
    'avg_per_trip_month', (select avg_purchase from avg_per_trip),
    'last_purchase_at', (select completed_at from last_purchase)
  );
$$;

create or replace function public.get_savings_suggestion()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with cmp as (
    select * from public.compare_supermarket_prices()
  ),
  best as (
    select * from cmp order by avg_total asc nulls last limit 1
  ),
  worst as (
    select * from cmp order by avg_total desc nulls last limit 1
  )
  select case
    when (select count(*) from cmp) < 2 then json_build_object('has_suggestion', false)
    else json_build_object(
      'has_suggestion', true,
      'best_market_id', (select supermarket_id from best),
      'best_market_name', (select supermarket_name from best),
      'worst_market_name', (select supermarket_name from worst),
      'estimated_savings',
        greatest(
          coalesce((select avg_total from worst), 0) - coalesce((select avg_total from best), 0),
          0
        )
    )
  end;
$$;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.user_can_access_list(uuid) to authenticated;
grant execute on function public.join_list_by_code(text) to authenticated;
grant execute on function public.get_most_bought_products(int) to authenticated;
grant execute on function public.get_price_variations(int) to authenticated;
grant execute on function public.compare_supermarket_prices() to authenticated;
grant execute on function public.get_monthly_stats() to authenticated;
grant execute on function public.get_savings_suggestion() to authenticated;
