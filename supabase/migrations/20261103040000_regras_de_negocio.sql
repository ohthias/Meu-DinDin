-- ════════════════════════════════════════════════════════════════════════════
-- Regras de negócio de acesso e envio de dados
--
-- Princípio: toda regra que protege dados vale no banco, porque o app, a API
-- e as Edge Functions são só clientes dele. O app repete as validações para
-- mostrar o erro antes de enviar (web/src/lib/regras.ts), mas não é ele que garante.
--
--  1. Configuração das regras (limites ajustáveis sem migration)
--  2. Acesso: conta de outra pessoa, WITH CHECK explícito e campos imutáveis
--  3. Termos de uso: só quem aceitou pode gravar dados
--  4. Validação do que é enviado, por tabela
--  5. Limites de uso e XP sem farm
--  6. Auditoria (quem mudou o quê)
--  7. Direitos do titular (LGPD): exportar os próprios dados
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Configuração ─────────────────────────────────────────────────────────
create table public.config_regras (
  chave      text primary key,
  valor      numeric not null,
  descricao  text not null
);
alter table public.config_regras enable row level security;
create policy "regras: leitura" on public.config_regras for select using (true);
-- escrita só pelo painel/SQL do projeto (service role); nenhum usuário altera

insert into public.config_regras values
  ('versao_termos',               1,        'Versão atual dos termos de uso; quem aceitou uma versão menor precisa aceitar de novo'),
  ('idade_minima',                16,       'Idade mínima para usar o app'),
  ('valor_maximo_transacao',      1000000,  'Maior valor aceito em uma transação manual (R$)'),
  ('anos_retroativos',            5,        'Transações manuais podem ter data até N anos atrás'),
  ('transacoes_por_dia',          300,      'Transações manuais criadas por dia, por pessoa'),
  ('max_contas_manuais',          20,       'Contas manuais por pessoa'),
  ('max_metas_ativas',            20,       'Metas não concluídas por pessoa'),
  ('valor_maximo_meta',           10000000, 'Maior valor de meta (R$)'),
  ('valor_maximo_orcamento',      1000000,  'Maior limite mensal por categoria (R$)'),
  ('meses_orcamento',             12,       'Orçamentos podem ser definidos até N meses antes ou depois do mês atual'),
  ('valor_maximo_investimento',   10000000, 'Maior valor de um aporte (R$)'),
  ('xp_transacoes_por_dia',       10,       'Só as primeiras N transações manuais do dia dão XP'),
  ('xp_metas_por_dia',            3,        'Só as primeiras N metas criadas no dia dão XP'),
  ('xp_investimentos_por_dia',    3,        'Só os primeiros N aportes do dia dão XP'),
  ('dias_auditoria',              365,      'Por quantos dias o histórico de alterações é guardado'),
  ('minutos_entre_sincronizacoes', 2,       'Intervalo mínimo entre sincronizações manuais de um banco'),
  ('max_conexoes_bancarias',      10,       'Bancos conectados via Open Finance por pessoa');

create or replace function public.regra(p_chave text)
returns numeric language sql stable security definer set search_path = public as $$
  select valor from config_regras where chave = p_chave
$$;

-- Erro de regra de negócio: mensagem em português, código próprio para o app reconhecer
create or replace function public.violar(p_mensagem text, p_campo text default null)
returns void language plpgsql as $$
begin
  raise exception using errcode = 'P0422', message = p_mensagem, hint = coalesce(p_campo, '');
end $$;

-- Ação feita por uma pessoa logada (e não por função de sistema/service role)?
create or replace function public.acao_do_usuario()
returns boolean language sql stable as $$ select auth.uid() is not null $$;

-- ── 2. Acesso: referências e dono ───────────────────────────────────────────
-- A brecha corrigida aqui: a chave estrangeira transacoes.conta_id só confere se a
-- conta existe, não de quem ela é. Dava para ligar uma transação à conta de outra
-- pessoa (ver trg_validar_transacao). As políticas de UPDATE ganham WITH CHECK
-- explícito; sem ele o Postgres repete o USING, então o efeito é o mesmo, mas a
-- regra fica visível para quem lê.
drop policy "perfil: editar o próprio" on public.profiles;
create policy "perfil: editar o próprio" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy "contas: editar" on public.contas;
create policy "contas: editar" on public.contas for update
  using (user_id = auth.uid() and origem = 'manual') with check (user_id = auth.uid() and origem = 'manual');

drop policy "transacoes: editar" on public.transacoes;
create policy "transacoes: editar" on public.transacoes for update
  using (user_id = auth.uid() and origem = 'manual') with check (user_id = auth.uid() and origem = 'manual');

drop policy "notificacoes: marcar" on public.notificacoes;
create policy "notificacoes: marcar" on public.notificacoes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- de uma notificação, a pessoa só pode mudar se foi lida
revoke update on public.notificacoes from authenticated;
grant update (lida) on public.notificacoes to authenticated;

-- Defesa extra (vale também para service role): dono, origem e id externo não mudam
create or replace function public.trg_campos_imutaveis() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then perform violar('Não é possível transferir um registro para outra pessoa.'); end if;
  -- (ifs aninhados: cada campo só é lido nas tabelas que o têm)
  if tg_table_name in ('transacoes', 'contas') then
    if new.origem is distinct from old.origem then perform violar('A origem de um registro não pode ser alterada.'); end if;
  end if;
  if tg_table_name = 'transacoes' then
    if new.external_id is distinct from old.external_id then perform violar('O identificador externo não pode ser alterado.'); end if;
  end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['contas','transacoes','orcamentos','metas','investimentos','notificacoes','of_conexoes'] loop
    execute format('create trigger a_imutaveis before update on public.%I for each row execute function public.trg_campos_imutaveis()', t);
  end loop;
end $$;

-- ── 3. Termos de uso ────────────────────────────────────────────────────────
alter table public.profiles
  add column termos_versao      int,
  add column termos_aceitos_em  timestamptz;

create or replace function public.termos_em_dia(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select termos_versao >= regra('versao_termos') from profiles where id = p_user), false)
$$;

create or replace function public.exigir_termos() returns void language plpgsql security definer set search_path = public as $$
begin
  if acao_do_usuario() and not termos_em_dia(auth.uid()) then
    perform violar('Aceite os termos de uso para salvar dados.');
  end if;
end $$;

create or replace function public.aceitar_termos(p_versao int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_versao < regra('versao_termos') then perform violar('Esta versão dos termos está desatualizada.'); end if;
  update profiles set termos_versao = p_versao, termos_aceitos_em = now() where id = auth.uid();
end $$;

-- Cadastro: o aceite feito na tela de cadastro vem nos metadados do usuário
create or replace function public.on_auth_user_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare versao int := nullif(new.raw_user_meta_data->>'termos_versao', '')::int;
begin
  insert into profiles (id, nome, data_nascimento, termos_versao, termos_aceitos_em)
  values (new.id,
          left(coalesce(nullif(texto_limpo(new.raw_user_meta_data->>'nome'), ''), rpad(split_part(new.email, '@', 1), 2, '_')), 60),
          nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
          versao,
          case when versao is not null then now() end);
  insert into desafios_usuario (user_id, desafio_id) select new.id, id from desafios;
  return new;
end $$;

-- ── 4. Validação do que é enviado ───────────────────────────────────────────
create or replace function public.texto_limpo(p text)
returns text language sql immutable as $$
  -- remove caracteres de controle e espaços repetidos
  select nullif(trim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g')), '')
$$;

create or replace function public.categoria_valida(p_tipo text, p_categoria text)
returns boolean language sql immutable as $$
  select case p_tipo
    when 'despesa' then p_categoria = any (array['Alimentação','Transporte','Moradia','Saúde','Educação','Lazer','Roupas','Streaming','Outro'])
    when 'receita' then p_categoria = any (array['Salário','Estágio','Bolsa','Freelance','Investimentos','Presente','Outro'])
    else false end
$$;

-- Perfil
create or replace function public.trg_validar_perfil() returns trigger language plpgsql as $$
begin
  new.nome := trim(texto_limpo(new.nome));
  if new.nome is null or char_length(new.nome) < 2 or char_length(new.nome) > 60 then
    perform violar('O nome precisa ter entre 2 e 60 caracteres.', 'nome');
  end if;
  if new.data_nascimento is not null then
    if new.data_nascimento > current_date - make_interval(years => regra('idade_minima')::int) then
      perform violar('É preciso ter pelo menos ' || regra('idade_minima')::int || ' anos para usar o Meu DinDin.', 'data_nascimento');
    end if;
    if new.data_nascimento < date '1900-01-01' then perform violar('Data de nascimento inválida.', 'data_nascimento'); end if;
  end if;
  return new;
end $$;
create trigger b_validar before insert or update of nome, data_nascimento on public.profiles
  for each row execute function public.trg_validar_perfil();

-- Transações
create or replace function public.trg_validar_transacao() returns trigger language plpgsql as $$
declare conta contas;
begin
  -- Regras para qualquer origem
  if new.conta_id is not null then
    select * into conta from contas where id = new.conta_id;
    if conta.user_id is distinct from new.user_id then perform violar('Conta não encontrada.', 'conta_id'); end if;
  end if;
  if new.origem <> 'manual' then return new; end if;

  -- Regras para o que a pessoa digita
  perform exigir_termos();
  if tg_op = 'INSERT' and (select count(*) from transacoes where user_id = new.user_id and origem = 'manual'
       and criado_em >= date_trunc('day', now())) >= regra('transacoes_por_dia') then
    perform violar('Você atingiu o limite de ' || regra('transacoes_por_dia')::int || ' transações por dia. Tente amanhã.');
  end if;
  if new.valor <= 0 then perform violar('O valor precisa ser maior que zero.', 'valor'); end if;
  if new.valor > regra('valor_maximo_transacao') then
    perform violar('O valor máximo de uma transação é R$ ' || replace(to_char(regra('valor_maximo_transacao'), 'FM999,999,999'), ',', '.') || '.', 'valor');
  end if;
  if new.data > current_date then perform violar('A data não pode estar no futuro.', 'data'); end if;
  if new.data < current_date - make_interval(years => regra('anos_retroativos')::int) then
    perform violar('A data não pode ser de mais de ' || regra('anos_retroativos')::int || ' anos atrás.', 'data');
  end if;
  if not categoria_valida(new.tipo, new.categoria) then perform violar('Categoria inválida para este tipo de transação.', 'categoria'); end if;
  new.descricao := coalesce(trim(texto_limpo(new.descricao)), '');
  if char_length(new.descricao) > 120 then perform violar('A descrição pode ter até 120 caracteres.', 'descricao'); end if;
  if new.forma_pagamento <> '' and not new.forma_pagamento = any (array['Pix','Débito','Crédito','Dinheiro','Boleto','Transferência']) then
    perform violar('Forma de pagamento inválida.', 'forma_pagamento');
  end if;
  if conta.origem = 'open_finance' then
    perform violar('Contas do Open Finance recebem só o que vem do banco. Escolha uma conta manual.', 'conta_id');
  end if;
  return new;
end $$;
create trigger b_validar before insert or update on public.transacoes
  for each row execute function public.trg_validar_transacao();

-- Contas manuais
create or replace function public.trg_validar_conta() returns trigger language plpgsql as $$
begin
  if new.origem <> 'manual' then return new; end if;
  perform exigir_termos();
  if new.conexao_id is not null or new.external_account_id is not null then
    perform violar('Contas manuais não podem ser ligadas a uma conexão bancária.');
  end if;
  new.nome := trim(texto_limpo(new.nome));
  if new.nome is null or char_length(new.nome) > 40 then perform violar('O nome da conta precisa ter entre 1 e 40 caracteres.', 'nome'); end if;
  new.instituicao := coalesce(trim(texto_limpo(new.instituicao)), '');
  if char_length(new.instituicao) > 40 then perform violar('A instituição pode ter até 40 caracteres.', 'instituicao'); end if;
  if abs(new.saldo) > 10000000 then perform violar('Saldo fora do limite aceito.', 'saldo'); end if;
  if tg_op = 'INSERT' and (select count(*) from contas where user_id = new.user_id and origem = 'manual') >= regra('max_contas_manuais') then
    perform violar('Você já tem ' || regra('max_contas_manuais')::int || ' contas manuais, o máximo permitido.');
  end if;
  return new;
end $$;
create trigger b_validar before insert or update on public.contas
  for each row execute function public.trg_validar_conta();

-- Metas
create or replace function public.trg_validar_meta() returns trigger language plpgsql as $$
begin
  perform exigir_termos();
  new.nome := trim(texto_limpo(new.nome));
  if new.nome is null or char_length(new.nome) > 60 then perform violar('O nome da meta precisa ter entre 1 e 60 caracteres.', 'nome'); end if;
  if new.valor_total > regra('valor_maximo_meta') then perform violar('Valor da meta acima do limite aceito.', 'valor_total'); end if;
  if new.valor_atual > new.valor_total then perform violar('O valor guardado não pode passar do valor da meta.', 'valor_atual'); end if;
  if new.cor !~ '^#[0-9A-Fa-f]{6}$' then perform violar('Cor inválida.', 'cor'); end if;
  if tg_op = 'INSERT' then
    if new.prazo is not null and (new.prazo < current_date or new.prazo > current_date + interval '50 years') then
      perform violar('O prazo precisa ser uma data entre hoje e daqui a 50 anos.', 'prazo');
    end if;
    if (select count(*) from metas where user_id = new.user_id and valor_atual < valor_total) >= regra('max_metas_ativas') then
      perform violar('Você já tem ' || regra('max_metas_ativas')::int || ' metas em andamento. Conclua ou exclua uma para criar outra.');
    end if;
  end if;
  return new;
end $$;
create trigger b_validar before insert or update on public.metas
  for each row execute function public.trg_validar_meta();

-- Orçamentos
create or replace function public.trg_validar_orcamento() returns trigger language plpgsql as $$
declare distancia int;
begin
  perform exigir_termos();
  if not categoria_valida('despesa', new.categoria) then perform violar('Categoria inválida.', 'categoria'); end if;
  if new.limite > regra('valor_maximo_orcamento') then perform violar('Limite acima do valor aceito.', 'limite'); end if;
  distancia := abs((new.ano * 12 + new.mes) - (extract(year from current_date)::int * 12 + extract(month from current_date)::int));
  if distancia > regra('meses_orcamento') then
    perform violar('Orçamentos podem ser definidos até ' || regra('meses_orcamento')::int || ' meses antes ou depois do mês atual.', 'mes');
  end if;
  return new;
end $$;
create trigger b_validar before insert or update on public.orcamentos
  for each row execute function public.trg_validar_orcamento();

-- Investimentos
create or replace function public.trg_validar_investimento() returns trigger language plpgsql as $$
declare esperado text[];
begin
  perform exigir_termos();
  if tg_op = 'UPDATE' and old.resgatado_em is not null then
    perform violar('Aplicações resgatadas não podem ser alteradas.');
  end if;
  if new.valor > regra('valor_maximo_investimento') then perform violar('Valor acima do limite aceito.', 'valor'); end if;
  if new.data_aporte > current_date then perform violar('A data da aplicação não pode estar no futuro.', 'data_aporte'); end if;
  if new.data_aporte < current_date - interval '30 years' then perform violar('Data da aplicação muito antiga.', 'data_aporte'); end if;
  if new.vencimento is not null and new.vencimento <= new.data_aporte then
    perform violar('O vencimento precisa ser depois da data da aplicação.', 'vencimento');
  end if;
  -- cada produto só aceita os indexadores que fazem sentido para ele
  esperado := case new.tipo
    when 'Poupanca' then array['poupanca']
    when 'TesouroSelic' then array['selic']
    when 'TesouroPrefixado' then array['pre']
    when 'TesouroIPCA' then array['ipca']
    else array['pos_cdi', 'pre', 'ipca'] end;
  if not new.indexador = any (esperado) then perform violar('Indexador incompatível com o produto.', 'indexador'); end if;
  if (new.indexador = 'pos_cdi' and new.taxa not between 1 and 200)
     or (new.indexador = 'selic' and new.taxa not between 50 and 150)
     or (new.indexador = 'pre' and new.taxa not between 0.01 and 50)
     or (new.indexador = 'ipca' and new.taxa not between 0 and 30) then
    perform violar('Taxa fora da faixa possível para este tipo de rendimento.', 'taxa');
  end if;
  new.emissor := coalesce(trim(texto_limpo(new.emissor)), '');
  if char_length(new.emissor) > 60 then perform violar('O emissor pode ter até 60 caracteres.', 'emissor'); end if;
  if new.resgatado_em is not null then
    if new.resgatado_em < new.data_aporte or new.resgatado_em > current_date then
      perform violar('A data do resgate precisa ficar entre a aplicação e hoje.', 'resgatado_em');
    end if;
    if new.valor_resgate is null then perform violar('Informe o valor recebido no resgate.', 'valor_resgate'); end if;
  end if;
  return new;
end $$;
create trigger b_validar before insert or update on public.investimentos
  for each row execute function public.trg_validar_investimento();

-- Depósito em meta respeita os termos e valida o valor
create or replace function public.depositar_meta(p_meta uuid, p_valor numeric)
returns metas language plpgsql security definer set search_path = public as $$
declare m metas;
begin
  perform exigir_termos();
  if p_valor is null or p_valor <= 0 then perform violar('O valor precisa ser maior que zero.', 'valor'); end if;
  if p_valor > regra('valor_maximo_meta') then perform violar('Valor acima do limite aceito.', 'valor'); end if;
  update metas set valor_atual = least(valor_total, valor_atual + p_valor)
   where id = p_meta and user_id = auth.uid() returning * into m;
  if not found then perform violar('Meta não encontrada.'); end if;
  if m.valor_atual >= m.valor_total then perform conceder_medalha(auth.uid(), 9); end if;
  return m;
end $$;

-- ── 5. XP sem farm: criar e apagar repetidamente não rende XP infinito ──────
create or replace function public.trg_xp_transacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.origem = 'manual' then
    if (select count(*) from transacoes where user_id = new.user_id and origem = 'manual'
         and criado_em >= date_trunc('day', now())) <= regra('xp_transacoes_por_dia') then
      perform adicionar_xp(new.user_id, 10);
    end if;
    perform atualizar_conquistas_usuario(new.user_id);
  end if;
  return new;
end $$;

create or replace function public.trg_xp_meta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from metas where user_id = new.user_id and criado_em >= date_trunc('day', now())) <= regra('xp_metas_por_dia') then
    perform adicionar_xp(new.user_id, 25);
  end if;
  perform conceder_medalha(new.user_id, 1);
  return new;
end $$;

create or replace function public.trg_xp_investimento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from investimentos where user_id = new.user_id and criado_em >= date_trunc('day', now())) <= regra('xp_investimentos_por_dia') then
    perform adicionar_xp(new.user_id, 50);
  end if;
  perform conceder_medalha(new.user_id, 5);
  return new;
end $$;

-- ── 6. Auditoria ────────────────────────────────────────────────────────────
-- Registra o que a pessoa fez (e toda mudança em conexões bancárias, que envolvem
-- consentimento de compartilhamento). Sincronizações automáticas de transações não
-- entram, para não afogar o histórico em milhares de linhas.
create table public.auditoria (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users on delete cascade,
  tabela       text not null,
  operacao     text not null check (operacao in ('INSERT','UPDATE','DELETE')),
  registro_id  text,
  autor        text not null check (autor in ('usuario','sistema')),
  antes        jsonb,
  depois       jsonb,
  quando       timestamptz not null default now()
);
create index on public.auditoria (user_id, quando desc);
alter table public.auditoria enable row level security;
create policy "auditoria: ler a própria" on public.auditoria for select using (user_id = auth.uid());
-- ninguém insere, edita ou apaga pelo app: só o gatilho abaixo (security definer)

create or replace function public.trg_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  linha jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  dono uuid := coalesce((linha->>'user_id')::uuid, (linha->>'id')::uuid);
  autor text := case when auth.uid() is not null then 'usuario' else 'sistema' end;
begin
  if autor = 'sistema' and tg_table_name <> 'of_conexoes' then return null; end if;
  -- exclusão da conta: os registros somem em cascata e não há mais a quem atribuir
  if not exists (select 1 from auth.users where id = dono) then return null; end if;
  -- só o essencial: sem guardar campos internos repetidos
  insert into auditoria (user_id, tabela, operacao, registro_id, autor, antes, depois)
  values (dono, tg_table_name, tg_op, linha->>'id', autor,
          case when tg_op <> 'INSERT' then to_jsonb(old) - 'user_id' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'user_id' end);
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['contas','transacoes','orcamentos','metas','investimentos','of_conexoes'] loop
    execute format('create trigger z_auditar after insert or update or delete on public.%I for each row execute function public.trg_auditar()', t);
  end loop;
end $$;
create trigger z_auditar after update of nome, data_nascimento, termos_versao on public.profiles
  for each row execute function public.trg_auditar();

-- Limpeza (agende com pg_cron: select cron.schedule('limpar-auditoria', '0 4 * * *', 'select public.limpar_auditoria()'))
create or replace function public.limpar_auditoria()
returns int language sql security definer set search_path = public as $$
  with apagados as (delete from auditoria where quando < now() - make_interval(days => regra('dias_auditoria')::int) returning 1)
  select count(*)::int from apagados
$$;

-- ── 7. LGPD: exportar os próprios dados ─────────────────────────────────────
-- (A exclusão da conta fica na Edge Function minha-conta, que também remove as
--  conexões no agregador de Open Finance antes de apagar o usuário.)
create or replace function public.exportar_meus_dados()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform violar('Faça login para exportar seus dados.'); end if;
  return jsonb_build_object(
    'gerado_em', now(),
    'perfil', (select to_jsonb(p) from profiles p where id = uid),
    'conexoes_open_finance', coalesce((select jsonb_agg(to_jsonb(c) - 'user_id') from of_conexoes c where user_id = uid), '[]'),
    'contas', coalesce((select jsonb_agg(to_jsonb(c) - 'user_id') from contas c where user_id = uid), '[]'),
    'transacoes', coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' order by data) from transacoes t where user_id = uid), '[]'),
    'orcamentos', coalesce((select jsonb_agg(to_jsonb(o) - 'user_id') from orcamentos o where user_id = uid), '[]'),
    'metas', coalesce((select jsonb_agg(to_jsonb(m) - 'user_id') from metas m where user_id = uid), '[]'),
    'investimentos', coalesce((select jsonb_agg(to_jsonb(i) - 'user_id') from investimentos i where user_id = uid), '[]'),
    'desafios', coalesce((select jsonb_agg(to_jsonb(d) - 'user_id') from desafios_usuario d where user_id = uid), '[]'),
    'medalhas', coalesce((select jsonb_agg(to_jsonb(m) - 'user_id') from medalhas_usuario m where user_id = uid), '[]'),
    'modulos_educacao', coalesce((select jsonb_agg(to_jsonb(m) - 'user_id') from modulos_usuario m where user_id = uid), '[]'),
    'notificacoes', coalesce((select jsonb_agg(to_jsonb(n) - 'user_id') from notificacoes n where user_id = uid), '[]'),
    'historico_de_alteracoes', coalesce((select jsonb_agg(to_jsonb(a) - 'user_id' order by quando desc) from auditoria a where user_id = uid), '[]')
  );
end $$;

-- Funções internas fora do alcance do cliente
revoke execute on function public.limpar_auditoria(), public.termos_em_dia(uuid) from public, anon, authenticated;
