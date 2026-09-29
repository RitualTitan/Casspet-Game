-- Limpeza automatica do ranking, para o banco nao crescer sem limite (cada partida cria uma conta anonima)
-- nem virar alvo facil de abuso. Roda todo dia pelo pg_cron. Nunca mexe em quem esta no ranking.

create extension if not exists pg_cron;

create or replace function public.limpar_ranking()
returns void
language sql
security definer
set search_path = public, auth
as $$
    -- Contas anonimas sem nenhuma partida aceita e paradas ha mais de 7 dias saem (a cascata leva as
    -- partidas 'aberta'/'recusada' e o apelido junto). Quem tem partida aceita fica no ranking para sempre.
    delete from auth.users u
    where u.is_anonymous
      and u.created_at < now() - interval '7 days'
      and not exists (
          select 1 from public.partidas p
          where p.jogador = u.id and p.situacao = 'aceita'
      );

    -- De quem ficou (tem partida aceita), enxuga as partidas nao aceitas antigas: nao entram no ranking
    -- e so serviam para conferir trapaca na hora.
    delete from public.partidas
    where situacao in ('aberta', 'recusada')
      and coalesce(fim, inicio) < now() - interval '7 days';
$$;

-- Todo dia as 04:17 UTC (madrugada no Brasil). Reusa o mesmo nome, entao rodar a migracao de novo so atualiza.
select cron.schedule('limpar-ranking-diario', '17 4 * * *', $$select public.limpar_ranking()$$);
