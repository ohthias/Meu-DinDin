-- ════════════════════════════════════════════════════════════════════════════
-- Meu DinDin — schema Supabase (substitui o SQLite/EF Core do backend .NET)
-- Toda tabela de usuário tem RLS: cada pessoa só enxerga as próprias linhas.
-- ════════════════════════════════════════════════════════════════════════════


-- ── Perfil ───────────────────────────────────────────────────────────────────
create table public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  nome                  text not null default '',
  data_nascimento       date,
  foto_url              text,
  -- gamificação
  nivel                 int  not null default 1,
  xp                    int  not null default 0,
  moedas                int  not null default 0,
  titulo                text not null default 'Novato',
  itens_resgatados      jsonb not null default '[]',
  -- perfil financeiro (onboarding)
  onboarding_completo   boolean not null default false,
  fonte_renda           text not null default '',
  desafio_financeiro    text not null default '',
  objetivo_financeiro   text not null default '',
  perfil_investidor     text not null default 'Conservador',
  nivel_experiencia     text not null default 'Iniciante',
  porcentagem_poupanca  int  not null default 0,
  -- acessibilidade
  alto_contraste        boolean not null default false,
  texto_grande          boolean not null default false,
  reduzir_animacoes     boolean not null default false,
  preferencia_libras    boolean not null default false,
  criado_em             timestamptz not null default now()
);

-- ── Open Finance: conexões (Items do agregador) ──────────────────────────────
create table public.of_conexoes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users on delete cascade default auth.uid(),
  provider           text not null default 'pluggy',
  external_item_id   text not null unique,
  instituicao        text not null default '',
  instituicao_logo   text,
  instituicao_cor    text,
  status             text not null default 'UPDATING',
  status_detalhe     text,
  ultima_sync        timestamptz,
  criado_em          timestamptz not null default now()
);

-- ── Contas (manuais ou vindas do Open Finance) ───────────────────────────────
create table public.contas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users on delete cascade default auth.uid(),
  conexao_id           uuid references public.of_conexoes on delete cascade,
  external_account_id  text unique,
  origem               text not null default 'manual' check (origem in ('manual','open_finance')),
  nome                 text not null,
  tipo                 text not null default 'corrente' check (tipo in ('corrente','poupanca','cartao','outro')),
  instituicao          text not null default '',
  numero               text,
  saldo                numeric(14,2) not null default 0,
  limite_credito       numeric(14,2),
  moeda                text not null default 'BRL',
  atualizado_em        timestamptz not null default now(),
  criado_em            timestamptz not null default now()
);
create index on public.contas (user_id);

-- ── Transações ───────────────────────────────────────────────────────────────
create table public.transacoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade default auth.uid(),
  conta_id         uuid references public.contas on delete set null,
  external_id      text unique,
  origem           text not null default 'manual' check (origem in ('manual','open_finance')),
  tipo             text not null check (tipo in ('receita','despesa')),
  valor            numeric(14,2) not null check (valor >= 0),
  categoria        text not null default 'Outro',
  descricao        text not null default '',
  forma_pagamento  text not null default '',
  data             date not null default current_date,
  criado_em        timestamptz not null default now()
);
create index on public.transacoes (user_id, data desc);
create index on public.transacoes (conta_id, data desc);

-- ── Orçamentos mensais por categoria ─────────────────────────────────────────
create table public.orcamentos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  categoria  text not null,
  limite     numeric(14,2) not null check (limite > 0),
  mes        int not null check (mes between 1 and 12),
  ano        int not null,
  unique (user_id, categoria, mes, ano)
);

-- ── Metas ────────────────────────────────────────────────────────────────────
create table public.metas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade default auth.uid(),
  nome         text not null,
  valor_total  numeric(14,2) not null check (valor_total > 0),
  valor_atual  numeric(14,2) not null default 0 check (valor_atual >= 0),
  prazo        date,
  cor          text not null default '#F5B400',
  criado_em    timestamptz not null default now()
);

-- ── Investimentos (aportes) ──────────────────────────────────────────────────
create table public.investimentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade default auth.uid(),
  tipo         text not null check (tipo in ('Poupanca','TesouroSelic','CDB')),
  valor        numeric(14,2) not null check (valor > 0),
  data_aporte  date not null default current_date,
  criado_em    timestamptz not null default now()
);

-- ── Gamificação ──────────────────────────────────────────────────────────────
create table public.desafios (
  id             int primary key,
  titulo         text not null,
  descricao      text not null,
  xp_recompensa  int not null,
  duracao_dias   int not null,
  tipo           text not null
);

create table public.desafios_usuario (
  user_id       uuid not null references auth.users on delete cascade default auth.uid(),
  desafio_id    int not null references public.desafios,
  dia_atual     int not null default 0,
  ultimo_check  date,
  concluido     boolean not null default false,
  iniciado_em   timestamptz not null default now(),
  concluido_em  timestamptz,
  primary key (user_id, desafio_id)
);

create table public.medalhas (
  id         int primary key,
  titulo     text not null,
  descricao  text not null,
  emoji      text not null default '🏅'
);

create table public.medalhas_usuario (
  user_id         uuid not null references auth.users on delete cascade,
  medalha_id      int not null references public.medalhas,
  conquistada_em  timestamptz not null default now(),
  primary key (user_id, medalha_id)
);

create table public.notificacoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  titulo     text not null,
  mensagem   text not null default '',
  tipo       text not null default 'info',
  icone      text not null default '🔔',
  lida       boolean not null default false,
  criada_em  timestamptz not null default now()
);
create index on public.notificacoes (user_id, criada_em desc);

-- ── Seeds ────────────────────────────────────────────────────────────────────
insert into public.desafios values
  (1,'7 dias sem delivery','Não peça delivery por 7 dias.',150,7,'economia'),
  (2,'Registrar 30 dias seguidos','Registre transações por 30 dias.',300,30,'registro'),
  (3,'Guardar 10% da renda','Guarde pelo menos 10% da renda.',200,30,'meta'),
  (4,'Semana sem compras supérfluas','Evite gastos não essenciais.',100,7,'economia');

insert into public.medalhas values
  (1,'Primeira meta','Criou sua primeira meta.','🏅'),
  (2,'7 dias seguidos','Registrou por 7 dias seguidos.','🔥'),
  (3,'Economista','Economizou 3 meses consecutivos.','🏆'),
  (4,'Banco conectado','Conectou uma conta via Open Finance.','🔗'),
  (5,'Investidor','Fez o primeiro investimento.','📈'),
  (6,'Nível 10','Atingiu o nível 10.','🚀');

-- ════════════════════════════════════════════════════════════════════════════
-- Funções
-- ════════════════════════════════════════════════════════════════════════════

-- XP necessário para cada nível (índice = nível - 1)
create or replace function public.nivel_por_xp(p_xp int, out nivel int, out titulo text)
language sql immutable as $$
  select n, t from (values
    (1,0,'Novato'),(2,100,'Poupador'),(3,300,'Economizador'),(4,600,'Planejador'),
    (5,1000,'Financista'),(6,1500,'Gestor'),(7,2200,'Economista'),(8,3000,'Investidor'),
    (9,4000,'Especialista'),(10,5200,'Guru'),(11,6600,'Mestre DinDin')
  ) v(n, minimo, t) where p_xp >= minimo order by n desc limit 1
$$;

create or replace function public.notificar(p_user uuid, p_titulo text, p_msg text, p_tipo text, p_icone text)
returns void language sql security definer set search_path = public as $$
  insert into notificacoes (user_id, titulo, mensagem, tipo, icone) values (p_user, p_titulo, p_msg, p_tipo, p_icone);
$$;

create or replace function public.conceder_medalha(p_user uuid, p_medalha int)
returns void language plpgsql security definer set search_path = public as $$
declare m medalhas;
begin
  insert into medalhas_usuario (user_id, medalha_id) values (p_user, p_medalha)
  on conflict do nothing;
  if found then
    select * into m from medalhas where id = p_medalha;
    update profiles set moedas = moedas + 50 where id = p_user;
    perform notificar(p_user, m.emoji || ' Medalha desbloqueada: ' || m.titulo || '!', m.descricao, 'conquista', m.emoji);
  end if;
end $$;

create or replace function public.adicionar_xp(p_user uuid, p_xp int)
returns void language plpgsql security definer set search_path = public as $$
declare antes int; novo record;
begin
  select nivel into antes from profiles where id = p_user;
  update profiles set xp = xp + p_xp where id = p_user;
  select n.* into novo from profiles p, nivel_por_xp(p.xp) n where p.id = p_user;
  update profiles set nivel = novo.nivel, titulo = novo.titulo where id = p_user;
  if novo.nivel > antes then
    perform notificar(p_user, '🚀 Subiu para Nível ' || novo.nivel || ': ' || novo.titulo || '!',
                      'Parabéns! Você alcançou o nível ' || novo.nivel || '.', 'conquista', '🚀');
    if novo.nivel >= 10 then perform conceder_medalha(p_user, 6); end if;
  end if;
end $$;

-- Funções internas não podem ser chamadas direto pelo cliente
revoke execute on function public.adicionar_xp(uuid,int), public.conceder_medalha(uuid,int),
  public.notificar(uuid,text,text,text,text) from public, anon, authenticated;

-- Novo usuário → perfil + desafios iniciais
create or replace function public.on_auth_user_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nome, data_nascimento)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data->>'data_nascimento','')::date);
  insert into desafios_usuario (user_id, desafio_id) select new.id, id from desafios;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- XP por ação do usuário
create or replace function public.trg_xp_transacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.origem = 'manual' then perform adicionar_xp(new.user_id, 10); end if;
  return new;
end $$;
create trigger xp_transacao after insert on public.transacoes
  for each row execute function public.trg_xp_transacao();

create or replace function public.trg_xp_meta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform adicionar_xp(new.user_id, 25);
  perform conceder_medalha(new.user_id, 1);
  return new;
end $$;
create trigger xp_meta after insert on public.metas
  for each row execute function public.trg_xp_meta();

create or replace function public.trg_xp_investimento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform adicionar_xp(new.user_id, 50);
  perform conceder_medalha(new.user_id, 5);
  return new;
end $$;
create trigger xp_investimento after insert on public.investimentos
  for each row execute function public.trg_xp_investimento();

create or replace function public.trg_conexao_criada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform adicionar_xp(new.user_id, 75);
  perform conceder_medalha(new.user_id, 4);
  return new;
end $$;
create trigger conexao_criada after insert on public.of_conexoes
  for each row execute function public.trg_conexao_criada();

-- ── RPCs chamadas pelo app ───────────────────────────────────────────────────

-- Salva onboarding (mesmo mapeamento do AuthService.cs original)
create or replace function public.salvar_onboarding(respostas int[])
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); exp int := respostas[4];
begin
  update profiles set
    fonte_renda = (array['Bolsa/Estágio','CLT','Freelance','Familiar'])[respostas[1]+1],
    desafio_financeiro = (array['Gastar mais do que ganha','Não consegue poupar','Não sabe investir','Dívidas'])[respostas[2]+1],
    objetivo_financeiro = (array['Reserva de emergência','Viagem/Compra','Investir','Quitar dívidas'])[respostas[3]+1],
    perfil_investidor = case when exp <= 1 then 'Conservador' when exp = 2 then 'Moderado' else 'Arrojado' end,
    nivel_experiencia = case when exp <= 1 then 'Iniciante' when exp = 2 then 'Intermediário' else 'Avançado' end,
    porcentagem_poupanca = (array[3,7,15,25])[respostas[5]+1],
    alto_contraste = respostas[6] = 0,
    texto_grande = respostas[6] = 1,
    preferencia_libras = respostas[6] = 2,
    onboarding_completo = true
  where id = uid;
  perform notificar(uid, 'Perfil configurado! 🎯', 'Seu perfil foi personalizado. Confira as recomendações no início.', 'conquista', '🎯');
  perform adicionar_xp(uid, 50);
end $$;

-- Check-in diário de desafio (no máximo 1 avanço por dia)
create or replace function public.avancar_desafio(p_desafio int)
returns desafios_usuario language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); du desafios_usuario; d desafios;
begin
  select * into d from desafios where id = p_desafio;
  update desafios_usuario set dia_atual = dia_atual + 1, ultimo_check = current_date
   where user_id = uid and desafio_id = p_desafio and not concluido
     and (ultimo_check is null or ultimo_check < current_date)
  returning * into du;
  if not found then raise exception 'Check-in já feito hoje ou desafio concluído'; end if;
  if du.dia_atual >= d.duracao_dias then
    update desafios_usuario set concluido = true, concluido_em = now()
     where user_id = uid and desafio_id = p_desafio returning * into du;
    perform adicionar_xp(uid, d.xp_recompensa);
    update profiles set moedas = moedas + d.xp_recompensa / 2 where id = uid;
    perform notificar(uid, '🏆 Desafio concluído: ' || d.titulo || '!',
      '+' || d.xp_recompensa || ' XP e +' || d.xp_recompensa / 2 || ' moedas.', 'conquista', '🏆');
    if p_desafio = 2 then perform conceder_medalha(uid, 2); end if;
  end if;
  return du;
end $$;

-- Depositar em meta
create or replace function public.depositar_meta(p_meta uuid, p_valor numeric)
returns metas language plpgsql security invoker set search_path = public as $$
declare m metas;
begin
  update metas set valor_atual = least(valor_total, valor_atual + p_valor)
   where id = p_meta and user_id = auth.uid() returning * into m;
  return m;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles          enable row level security;
alter table public.of_conexoes       enable row level security;
alter table public.contas            enable row level security;
alter table public.transacoes        enable row level security;
alter table public.orcamentos        enable row level security;
alter table public.metas             enable row level security;
alter table public.investimentos     enable row level security;
alter table public.desafios          enable row level security;
alter table public.desafios_usuario  enable row level security;
alter table public.medalhas          enable row level security;
alter table public.medalhas_usuario  enable row level security;
alter table public.notificacoes      enable row level security;

create policy "perfil: ler o próprio"   on public.profiles for select using (id = auth.uid());
create policy "perfil: editar o próprio" on public.profiles for update using (id = auth.uid());

-- Colunas de gamificação só mudam via funções security definer
revoke update on public.profiles from authenticated;
grant update (nome, data_nascimento, foto_url, alto_contraste, texto_grande, reduzir_animacoes, preferencia_libras)
  on public.profiles to authenticated;

-- Conexões Open Finance: escrita só pela Edge Function (service role)
create policy "conexoes: ler"    on public.of_conexoes for select using (user_id = auth.uid());
create policy "conexoes: apagar" on public.of_conexoes for delete using (user_id = auth.uid());

-- Contas/transações: o usuário gerencia as manuais; as de Open Finance são só leitura
create policy "contas: ler"   on public.contas for select using (user_id = auth.uid());
create policy "contas: criar" on public.contas for insert with check (user_id = auth.uid() and origem = 'manual');
create policy "contas: editar" on public.contas for update using (user_id = auth.uid() and origem = 'manual');
create policy "contas: apagar" on public.contas for delete using (user_id = auth.uid() and origem = 'manual');

create policy "transacoes: ler"   on public.transacoes for select using (user_id = auth.uid());
create policy "transacoes: criar" on public.transacoes for insert with check (user_id = auth.uid() and origem = 'manual');
create policy "transacoes: editar" on public.transacoes for update using (user_id = auth.uid() and origem = 'manual');
create policy "transacoes: apagar" on public.transacoes for delete using (user_id = auth.uid() and origem = 'manual');

create policy "orcamentos: tudo"    on public.orcamentos    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "metas: tudo"         on public.metas         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "investimentos: tudo" on public.investimentos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "desafios: catálogo" on public.desafios for select using (true);
create policy "medalhas: catálogo" on public.medalhas for select using (true);
create policy "desafios_usuario: ler" on public.desafios_usuario for select using (user_id = auth.uid());
create policy "medalhas_usuario: ler" on public.medalhas_usuario for select using (user_id = auth.uid());

create policy "notificacoes: ler"    on public.notificacoes for select using (user_id = auth.uid());
create policy "notificacoes: marcar" on public.notificacoes for update using (user_id = auth.uid());
create policy "notificacoes: apagar" on public.notificacoes for delete using (user_id = auth.uid());

-- Realtime para o app reagir a sincronizações do Open Finance
alter publication supabase_realtime add table public.of_conexoes, public.contas, public.notificacoes;
