-- Ranking online do Granulando.
-- O jogo nunca grava direto nas tabelas: so a funcao "partida" (com a chave de servico) grava, depois de
-- conferir cada partida pelo relogio do servidor. O jogo so le a vista "ranking" e o proprio apelido.

create table public.jogadores (
    id uuid primary key references auth.users (id) on delete cascade,
    apelido text not null check (char_length(apelido) between 3 and 16),
    criado_em timestamptz not null default now()
);

create table public.partidas (
    id uuid primary key default gen_random_uuid(),
    jogador uuid not null references public.jogadores (id) on delete cascade,
    inicio timestamptz not null default now(),
    fim timestamptz,
    troncos integer,
    granulados integer,
    altura integer,
    -- aberta: comecou e ainda nao terminou; aceita: entra no ranking; recusada: nao cabe no tempo (motivo diz
    -- por que) ou foi apagada pelo time no painel do Supabase.
    situacao text not null default 'aberta' check (situacao in ('aberta', 'aceita', 'recusada')),
    motivo text
);

create index partidas_do_jogador on public.partidas (jogador, inicio desc);
create index partidas_aceitas on public.partidas (situacao, troncos desc, granulados desc);

alter table public.jogadores enable row level security;
alter table public.partidas enable row level security;

-- Cada jogador pode ler o proprio apelido. Nenhuma politica de gravacao: insert/update/delete ficam fechados.
create policy "jogador le o proprio apelido" on public.jogadores
    for select to authenticated using (auth.uid() = id);

revoke all on public.jogadores from anon, authenticated;
revoke all on public.partidas from anon, authenticated;
grant select on public.jogadores to authenticated;

-- A melhor partida aceita de cada jogador, por troncos (desempate: granulados, depois quem fez primeiro).
-- A vista roda com os direitos do dono, entao mostra o ranking sem abrir as tabelas.
create view public.ranking as
select
    row_number() over (order by melhor.troncos desc, melhor.granulados desc, melhor.fim asc) as posicao,
    jogadores.apelido,
    melhor.troncos,
    melhor.granulados,
    melhor.jogador
from (
    select distinct on (jogador) jogador, troncos, granulados, fim
    from public.partidas
    where situacao = 'aceita'
    order by jogador, troncos desc, granulados desc, fim asc
) as melhor
join public.jogadores on jogadores.id = melhor.jogador;

revoke all on public.ranking from anon, authenticated;
grant select on public.ranking to anon, authenticated;
