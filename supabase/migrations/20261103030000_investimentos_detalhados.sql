-- ════════════════════════════════════════════════════════════════════════════
-- Investimentos com mais detalhe: mais produtos, taxa contratada, vencimento e resgate
-- ════════════════════════════════════════════════════════════════════════════

alter table public.investimentos drop constraint investimentos_tipo_check;

-- Nomes antigos continuam válidos; novos produtos entram na mesma coluna
alter table public.investimentos
  add constraint investimentos_tipo_check check (tipo in (
    'Poupanca', 'TesouroSelic', 'TesouroPrefixado', 'TesouroIPCA', 'CDB', 'LCI', 'LCA'
  )),
  -- Como interpretar `taxa`:
  --   pos_cdi  → percentual do CDI (ex.: 110 = 110% do CDI)
  --   pre      → taxa ao ano (ex.: 12.5 = 12,5% a.a.)
  --   ipca     → juro real acima do IPCA ao ano (ex.: 6.8 = IPCA + 6,8%)
  --   selic    → percentual da Selic (Tesouro Selic ≈ 100)
  --   poupanca → ignorada (regra da poupança)
  add column indexador       text not null default 'pos_cdi'
                             check (indexador in ('pos_cdi','pre','ipca','selic','poupanca')),
  add column taxa            numeric(8,4) not null default 100 check (taxa >= 0),
  add column emissor         text not null default '',
  add column vencimento      date,
  add column liquidez_diaria boolean not null default true,
  add column resgatado_em    date,
  add column valor_resgate   numeric(14,2) check (valor_resgate >= 0);

-- Ajusta os registros antigos para o novo formato
update public.investimentos set indexador = 'poupanca', taxa = 0   where tipo = 'Poupanca';
update public.investimentos set indexador = 'selic',    taxa = 100 where tipo = 'TesouroSelic';
update public.investimentos set indexador = 'pos_cdi',  taxa = 110 where tipo = 'CDB';

-- Resgate: marca o aporte como encerrado e registra a entrada no extrato
create or replace function public.resgatar_investimento(p_id uuid, p_valor numeric, p_data date default current_date)
returns investimentos language plpgsql security invoker set search_path = public as $$
declare i investimentos;
begin
  if p_valor < 0 then raise exception 'Valor inválido'; end if;
  update investimentos set resgatado_em = p_data, valor_resgate = p_valor
   where id = p_id and user_id = auth.uid() and resgatado_em is null
  returning * into i;
  if not found then raise exception 'Investimento não encontrado ou já resgatado'; end if;
  insert into transacoes (tipo, valor, categoria, descricao, forma_pagamento, data)
  values ('receita', p_valor, 'Investimentos', 'Resgate de investimento', 'Transferência', p_data);
  return i;
end $$;
