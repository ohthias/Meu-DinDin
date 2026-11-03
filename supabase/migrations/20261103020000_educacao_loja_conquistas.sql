-- ════════════════════════════════════════════════════════════════════════════
-- Educação financeira, loja de recompensas e conquistas verificadas
-- ════════════════════════════════════════════════════════════════════════════

-- ── Perfil: itens equipados e consumíveis ───────────────────────────────────
alter table public.profiles
  add column tema           text not null default 'padrao',
  add column avatar         text,
  add column moldura        text,
  add column congelamentos  int  not null default 0 check (congelamentos >= 0),
  add column boost_xp_ate   timestamptz;
-- (as colunas novas ficam fora do GRANT de update: só mudam pelas funções abaixo)

-- ── Educação: catálogo e progresso ──────────────────────────────────────────
-- O conteúdo das lições fica no app (web/src/lib/educacao.ts); aqui ficam só
-- os dados que valem recompensa, para o cliente não inventar módulo nem total.
create table public.modulos_educacao (
  id              text primary key,
  titulo          text not null,
  total_questoes  int  not null,
  xp              int  not null,
  moedas          int  not null,
  ordem           int  not null
);

create table public.modulos_usuario (
  user_id         uuid not null references auth.users on delete cascade,
  modulo_id       text not null references public.modulos_educacao,
  melhor_acertos  int  not null default 0,
  tentativas      int  not null default 0,
  concluido_em    timestamptz,
  perfeito_em     timestamptz,
  atualizado_em   timestamptz not null default now(),
  primary key (user_id, modulo_id)
);

insert into public.modulos_educacao values
  ('orcamento',         'Orçamento pessoal',            6, 60, 15, 1),
  ('reserva',           'Reserva de emergência',        6, 60, 15, 2),
  ('juros-compostos',   'Juros compostos',              6, 70, 20, 3),
  ('primeiro-emprego',  'Primeiro emprego e estágio',   6, 70, 20, 4),
  ('investimentos',     'Primeiros investimentos',      6, 80, 20, 5),
  ('inflacao',          'Inflação e poder de compra',   5, 70, 20, 6),
  ('credito',           'Crédito consciente',           6, 80, 20, 7),
  ('dividas',           'Saindo das dívidas',           5, 80, 20, 8),
  ('golpes',            'Pix e golpes digitais',        6, 80, 25, 9),
  ('open-finance',      'Open Finance e seus dados',    5, 70, 20, 10);

-- ── Loja ────────────────────────────────────────────────────────────────────
create table public.loja_itens (
  id         text primary key,
  nome       text not null,
  descricao  text not null,
  icone      text not null,
  custo      int  not null check (custo > 0),
  tipo       text not null check (tipo in ('tema','avatar','moldura','congelamento','boost')),
  ordem      int  not null
);

insert into public.loja_itens values
  ('tema-noturno',    'Tema noturno',        'Fundo escuro para usar à noite sem cansar a vista.',               '🌙', 250, 'tema',        1),
  ('tema-menta',      'Tema menta',          'Troca o mostarda por um verde fresco em todo o app.',              '🌿', 180, 'tema',        2),
  ('tema-lavanda',    'Tema lavanda',        'Destaques em lilás, com o mesmo fundo creme.',                     '💜', 180, 'tema',        3),
  ('avatar-raposa',   'Avatar raposa',       'Troca a inicial do seu perfil por uma raposa.',                    '🦊', 90,  'avatar',      4),
  ('avatar-coruja',   'Avatar coruja',       'Para quem estuda finanças de madrugada.',                          '🦉', 90,  'avatar',      5),
  ('avatar-panda',    'Avatar panda',        'Calmo e econômico.',                                               '🐼', 90,  'avatar',      6),
  ('avatar-foguete',  'Avatar foguete',      'Para quem está subindo de nível rápido.',                          '🚀', 120, 'avatar',      7),
  ('moldura-ouro',    'Moldura dourada',     'Um anel dourado em volta do seu avatar.',                          '💎', 400, 'moldura',     8),
  ('congelar',        'Congelar sequência',  'Salva um desafio de check-in se você esquecer um dia. Acumulável.', '🧊', 60,  'congelamento', 9),
  ('xp-dobro',        'XP em dobro (24 h)',  'Todo XP ganho nas próximas 24 horas conta em dobro.',              '⚡', 140, 'boost',      10);

-- ── Desafios: verificados automaticamente ou por check-in ──────────────────
alter table public.desafios
  add column modo     text not null default 'checkin' check (modo in ('checkin','auto')),
  add column unidade  text not null default 'dias';

update public.desafios set modo = 'checkin', descricao = 'Não peça delivery por 7 dias seguidos. Faça o check-in a cada dia cumprido.' where id = 1;
update public.desafios set modo = 'auto', titulo = 'Registrar 30 dias seguidos',
  descricao = 'Registre pelo menos uma transação por dia. A sequência é contada automaticamente.' where id = 2;
update public.desafios set modo = 'auto', unidade = '%', duracao_dias = 10,
  descricao = 'Termine um mês guardando pelo menos 10% do que entrou. Calculado pelo seu extrato.' where id = 3;
update public.desafios set modo = 'checkin', descricao = 'Uma semana só com gastos essenciais. Faça o check-in a cada dia cumprido.' where id = 4;

insert into public.desafios (id, titulo, descricao, xp_recompensa, duracao_dias, tipo, modo, unidade) values
  (5, 'Estudante dedicado', 'Conclua 3 módulos de educação financeira.', 150, 3, 'educacao', 'auto', 'módulos'),
  (6, 'Orçamento montado',  'Defina limite para 3 categorias no mês atual.', 100, 3, 'orcamento', 'auto', 'categorias');

insert into public.desafios_usuario (user_id, desafio_id)
  select p.id, d.id from public.profiles p cross join public.desafios d where d.id in (5, 6)
  on conflict do nothing;

-- ── Medalhas novas ──────────────────────────────────────────────────────────
update public.medalhas set descricao = 'Registrou transações 7 dias seguidos.' where id = 2;
update public.medalhas set descricao = 'Fechou 3 meses seguidos com mais entradas do que saídas.' where id = 3;
insert into public.medalhas values
  (7,  'Primeira lição',  'Concluiu o primeiro módulo de educação.',  '📚'),
  (8,  'Formado',         'Concluiu todos os módulos de educação.',   '🎓'),
  (9,  'Meta alcançada',  'Completou o valor de uma meta.',            '🎯'),
  (10, 'Desafiante',      'Concluiu o primeiro desafio.',              '💪'),
  (11, 'Colecionador',    'Fez a primeira troca na loja.',             '🛍️'),
  (12, 'Nota 10',         'Acertou todas as questões de um módulo.',   '⭐');

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.modulos_educacao enable row level security;
alter table public.modulos_usuario  enable row level security;
alter table public.loja_itens       enable row level security;
create policy "modulos: catálogo" on public.modulos_educacao for select using (true);
create policy "modulos_usuario: ler" on public.modulos_usuario for select using (user_id = auth.uid());
create policy "loja: catálogo" on public.loja_itens for select using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- Funções
-- ════════════════════════════════════════════════════════════════════════════

-- XP agora respeita o bônus em dobro, dá moedas ao subir de nível e devolve o XP aplicado
drop function public.adicionar_xp(uuid, int);
create function public.adicionar_xp(p_user uuid, p_xp int)
returns int language plpgsql security definer set search_path = public as $$
declare antes int; novo record; ganho int;
begin
  select nivel, case when boost_xp_ate > now() then p_xp * 2 else p_xp end
    into antes, ganho from profiles where id = p_user;
  update profiles set xp = xp + ganho where id = p_user;
  select n.* into novo from profiles p, nivel_por_xp(p.xp) n where p.id = p_user;
  update profiles set nivel = novo.nivel, titulo = novo.titulo where id = p_user;
  if novo.nivel > antes then
    update profiles set moedas = moedas + 30 * (novo.nivel - antes) where id = p_user;
    perform notificar(p_user, '🚀 Subiu para Nível ' || novo.nivel || ': ' || novo.titulo || '!',
                      'Você ganhou ' || 30 * (novo.nivel - antes) || ' moedas para gastar na loja.', 'conquista', '🚀');
    if novo.nivel >= 10 then perform conceder_medalha(p_user, 6); end if;
  end if;
  return ganho;
end $$;

-- Dias seguidos com transação registrada à mão, terminando hoje ou ontem
create or replace function public.sequencia_registros(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  with dias as (
    select distinct data from transacoes
     where user_id = p_user and origem = 'manual' and data <= current_date
  ), grupos as (
    select data, data - (row_number() over (order by data))::int as grp from dias
  ), ultimo as (
    select grp, max(data) as fim, count(*) as n from grupos group by grp order by fim desc limit 1
  )
  select coalesce((select n::int from ultimo where fim >= current_date - 1), 0)
$$;

-- Percentual guardado no mês (null se não houve entradas)
create or replace function public.taxa_poupanca(p_user uuid, p_mes date)
returns numeric language sql stable security definer set search_path = public as $$
  select case when sum(valor) filter (where tipo = 'receita') > 0 then
    (sum(valor) filter (where tipo = 'receita') - coalesce(sum(valor) filter (where tipo = 'despesa'), 0))
      / sum(valor) filter (where tipo = 'receita') * 100 end
  from transacoes
  where user_id = p_user and data >= date_trunc('month', p_mes) and data < date_trunc('month', p_mes) + interval '1 month'
$$;

create or replace function public.premiar_desafio(p_user uuid, p_desafio int)
returns void language plpgsql security definer set search_path = public as $$
declare d desafios; v_xp int;
begin
  select * into d from desafios where id = p_desafio;
  update desafios_usuario set concluido = true, concluido_em = now(), dia_atual = d.duracao_dias
   where user_id = p_user and desafio_id = p_desafio;
  v_xp := adicionar_xp(p_user, d.xp_recompensa);
  update profiles set moedas = moedas + d.xp_recompensa / 2 where id = p_user;
  perform notificar(p_user, '🏆 Desafio concluído: ' || d.titulo || '!',
    '+' || v_xp || ' XP e +' || d.xp_recompensa / 2 || ' moedas.', 'conquista', '🏆');
  perform conceder_medalha(p_user, 10);
end $$;

-- Recalcula desafios automáticos e medalhas que dependem dos dados
create or replace function public.atualizar_conquistas_usuario(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  seq int := sequencia_registros(p_user);
  taxa_atual numeric := taxa_poupanca(p_user, current_date);
  taxa_anterior numeric := taxa_poupanca(p_user, (current_date - interval '1 month')::date);
  modulos int;
  categorias int;
  r record;
  valor int;
  completo boolean;
begin
  select count(*) into modulos from modulos_usuario where user_id = p_user and concluido_em is not null;
  select count(*) into categorias from orcamentos
   where user_id = p_user and mes = extract(month from current_date) and ano = extract(year from current_date);

  for r in select du.desafio_id, d.duracao_dias as meta from desafios_usuario du join desafios d on d.id = du.desafio_id
            where du.user_id = p_user and not du.concluido and d.modo = 'auto' loop
    valor := case r.desafio_id
      when 2 then seq
      when 3 then greatest(0, floor(coalesce(taxa_atual, 0)))::int
      when 5 then modulos
      when 6 then categorias
      else 0 end;
    completo := case r.desafio_id
      -- poupança só vale com mês fechado (ou nos últimos dias do mês corrente)
      when 3 then coalesce(taxa_anterior, 0) >= 10 or (extract(day from current_date) >= 25 and coalesce(taxa_atual, 0) >= 10)
      else valor >= r.meta end;
    if completo then
      perform premiar_desafio(p_user, r.desafio_id);
    else
      update desafios_usuario set dia_atual = least(valor, r.meta) where user_id = p_user and desafio_id = r.desafio_id;
    end if;
  end loop;

  if seq >= 7 then perform conceder_medalha(p_user, 2); end if;
  -- Economista: 3 meses fechados seguidos no azul
  if (select count(*) from generate_series(1, 3) i
       where coalesce(taxa_poupanca(p_user, (current_date - make_interval(months => i))::date), -1) > 0) = 3 then
    perform conceder_medalha(p_user, 3);
  end if;
  if exists (select 1 from metas where user_id = p_user and valor_atual >= valor_total) then
    perform conceder_medalha(p_user, 9);
  end if;
end $$;

-- RPC chamada pela tela de conquistas
create or replace function public.sincronizar_conquistas()
returns void language sql security definer set search_path = public as $$
  select atualizar_conquistas_usuario(auth.uid())
$$;

-- Check-in diário: sequência quebra se pular um dia, a menos que haja congelamento
create or replace function public.avancar_desafio(p_desafio int)
returns desafios_usuario language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); du desafios_usuario; d desafios; dias_parado int;
begin
  select * into d from desafios where id = p_desafio;
  if d.modo <> 'checkin' then raise exception 'Este desafio é verificado automaticamente'; end if;
  select * into du from desafios_usuario where user_id = uid and desafio_id = p_desafio for update;
  if du.concluido then raise exception 'Desafio já concluído'; end if;
  if du.ultimo_check = current_date then raise exception 'Check-in já feito hoje'; end if;

  dias_parado := current_date - coalesce(du.ultimo_check, current_date) - 1;
  if du.dia_atual > 0 and dias_parado > 0 then
    if dias_parado = 1 and (select congelamentos from profiles where id = uid) > 0 then
      update profiles set congelamentos = congelamentos - 1 where id = uid;
      perform notificar(uid, '🧊 Sequência salva', 'Um congelamento protegeu "' || d.titulo || '".', 'info', '🧊');
    else
      du.dia_atual := 0;  -- perdeu a sequência
    end if;
  end if;

  update desafios_usuario set dia_atual = du.dia_atual + 1, ultimo_check = current_date
   where user_id = uid and desafio_id = p_desafio returning * into du;
  if du.dia_atual >= d.duracao_dias then
    perform premiar_desafio(uid, p_desafio);
    select * into du from desafios_usuario where user_id = uid and desafio_id = p_desafio;
  end if;
  return du;
end $$;

-- Recomeçar um desafio de check-in já concluído
create or replace function public.recomecar_desafio(p_desafio int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select modo from desafios where id = p_desafio) <> 'checkin' then raise exception 'Só desafios de check-in podem recomeçar'; end if;
  update desafios_usuario set concluido = false, concluido_em = null, dia_atual = 0, ultimo_check = null, iniciado_em = now()
   where user_id = auth.uid() and desafio_id = p_desafio and concluido;
end $$;

-- Metas: depositar e premiar quando completa
create or replace function public.depositar_meta(p_meta uuid, p_valor numeric)
returns metas language plpgsql security definer set search_path = public as $$
declare m metas;
begin
  if p_valor <= 0 then raise exception 'Valor inválido'; end if;
  update metas set valor_atual = least(valor_total, valor_atual + p_valor)
   where id = p_meta and user_id = auth.uid() returning * into m;
  if m.valor_atual >= m.valor_total then
    perform conceder_medalha(auth.uid(), 9);
  end if;
  return m;
end $$;

-- Transação manual: XP + verificação de sequência/medalhas
create or replace function public.trg_xp_transacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.origem = 'manual' then
    perform adicionar_xp(new.user_id, 10);
    perform atualizar_conquistas_usuario(new.user_id);
  end if;
  return new;
end $$;

-- ── Educação: concluir módulo ───────────────────────────────────────────────
-- Aprovação com 70%. XP e moedas só na primeira aprovação; bônus na primeira nota máxima.
create or replace function public.concluir_modulo(p_modulo text, p_acertos int)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m modulos_educacao;
  atual modulos_usuario;
  aprovado boolean;
  primeira boolean := false;
  perfeito_agora boolean := false;
  v_xp int := 0;
  v_moedas int := 0;
begin
  select * into m from modulos_educacao where id = p_modulo;
  if m is null then raise exception 'Módulo desconhecido'; end if;
  if p_acertos < 0 or p_acertos > m.total_questoes then raise exception 'Pontuação inválida'; end if;
  aprovado := p_acertos >= ceil(m.total_questoes * 0.7);

  insert into modulos_usuario (user_id, modulo_id) values (uid, p_modulo) on conflict do nothing;
  select * into atual from modulos_usuario where user_id = uid and modulo_id = p_modulo for update;

  if aprovado and atual.concluido_em is null then
    primeira := true;
    v_xp := adicionar_xp(uid, m.xp);
    v_moedas := m.moedas;
  end if;
  if p_acertos = m.total_questoes and atual.perfeito_em is null then
    perfeito_agora := true;
    v_xp := v_xp + adicionar_xp(uid, 20);
    v_moedas := v_moedas + 10;
  end if;

  update modulos_usuario set
    tentativas = tentativas + 1,
    melhor_acertos = greatest(melhor_acertos, p_acertos),
    concluido_em = case when aprovado then coalesce(concluido_em, now()) else concluido_em end,
    perfeito_em = case when perfeito_agora then now() else perfeito_em end,
    atualizado_em = now()
  where user_id = uid and modulo_id = p_modulo;

  if v_moedas > 0 then update profiles set moedas = moedas + v_moedas where id = uid; end if;
  if primeira then
    perform notificar(uid, '🎓 Módulo concluído: ' || m.titulo,
      p_acertos || ' de ' || m.total_questoes || ' acertos. +' || v_xp || ' XP e +' || v_moedas || ' moedas.', 'conquista', '🎓');
    perform conceder_medalha(uid, 7);
    if (select count(*) from modulos_usuario where user_id = uid and concluido_em is not null)
       = (select count(*) from modulos_educacao) then
      perform conceder_medalha(uid, 8);
    end if;
  end if;
  if perfeito_agora then perform conceder_medalha(uid, 12); end if;
  perform atualizar_conquistas_usuario(uid);

  return json_build_object('aprovado', aprovado, 'primeira_vez', primeira, 'perfeito', perfeito_agora, 'xp', v_xp, 'moedas', v_moedas);
end $$;

-- ── Loja ────────────────────────────────────────────────────────────────────
create or replace function public.comprar_item(p_item text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); i loja_itens; p profiles;
begin
  select * into i from loja_itens where id = p_item;
  if i is null then raise exception 'Item não encontrado'; end if;
  select * into p from profiles where id = uid for update;
  if i.tipo in ('tema','avatar','moldura') and p.itens_resgatados ? p_item then
    raise exception 'Você já tem este item';
  end if;
  if p.moedas < i.custo then
    raise exception 'Faltam % moedas para este item', i.custo - p.moedas;
  end if;

  update profiles set moedas = moedas - i.custo where id = uid;
  case i.tipo
    when 'tema' then update profiles set itens_resgatados = itens_resgatados || to_jsonb(p_item), tema = p_item where id = uid;
    when 'avatar' then update profiles set itens_resgatados = itens_resgatados || to_jsonb(p_item), avatar = p_item where id = uid;
    when 'moldura' then update profiles set itens_resgatados = itens_resgatados || to_jsonb(p_item), moldura = p_item where id = uid;
    when 'congelamento' then update profiles set congelamentos = congelamentos + 1 where id = uid;
    when 'boost' then update profiles set boost_xp_ate = greatest(coalesce(boost_xp_ate, now()), now()) + interval '24 hours' where id = uid;
  end case;
  perform notificar(uid, i.icone || ' ' || i.nome, 'Troca feita por ' || i.custo || ' moedas.', 'info', i.icone);
  perform conceder_medalha(uid, 11);
end $$;

-- Equipar (p_item null volta ao padrão)
create or replace function public.equipar_item(p_tipo text, p_item text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if p_item is not null then
    if not exists (select 1 from loja_itens where id = p_item and tipo = p_tipo) then raise exception 'Item inválido'; end if;
    if not (select itens_resgatados ? p_item from profiles where id = uid) then raise exception 'Você ainda não tem este item'; end if;
  end if;
  case p_tipo
    when 'tema' then update profiles set tema = coalesce(p_item, 'padrao') where id = uid;
    when 'avatar' then update profiles set avatar = p_item where id = uid;
    when 'moldura' then update profiles set moldura = p_item where id = uid;
    else raise exception 'Tipo inválido';
  end case;
end $$;

-- Funções internas fora do alcance do cliente
revoke execute on function
  public.adicionar_xp(uuid,int), public.premiar_desafio(uuid,int), public.atualizar_conquistas_usuario(uuid),
  public.sequencia_registros(uuid), public.taxa_poupanca(uuid,date)
from public, anon, authenticated;
