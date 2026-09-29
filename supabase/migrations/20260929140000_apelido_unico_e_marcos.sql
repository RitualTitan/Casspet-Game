-- Apelido unico (ninguem copia o de outro) e pontos de controle da partida (marcos), para o servidor conferir
-- que a partida foi jogada de verdade, nao so o placar final.

-- 1) Apelido unico. Guarda a chave normalizada (minuscula, sem acento) numa coluna com trava de unicidade.
alter table public.jogadores add column if not exists apelido_chave text;

create extension if not exists unaccent;
update public.jogadores set apelido_chave = lower(unaccent(apelido)) where apelido_chave is null;

-- Desempata apelidos ja repetidos antes de criar a trava: fica com o nome quem tem melhor partida aceita
-- (senao o mais antigo); os outros ganham um sufixo curto do id, para o nome ficar unico sem apagar ninguem.
with ordenados as (
    select j.id,
        row_number() over (
            partition by lower(unaccent(j.apelido))
            order by exists (select 1 from public.partidas p where p.jogador = j.id and p.situacao = 'aceita') desc,
                     j.criado_em asc
        ) as ordem
    from public.jogadores j
)
update public.jogadores j
set apelido = left(j.apelido, 12) || '-' || left(j.id::text, 3),
    apelido_chave = lower(unaccent(left(j.apelido, 12) || '-' || left(j.id::text, 3)))
from ordenados o
where o.id = j.id and o.ordem > 1;

create unique index if not exists jogadores_apelido_chave_uk on public.jogadores (apelido_chave);

-- 2) Pontos de controle. Cada partida guarda o ultimo marco (tempo do servidor + placar), quantos marcos
-- recebeu e o maior buraco entre eles; a funcao "partida" usa isso para conferir cada trecho e a cobertura.
alter table public.partidas
    add column if not exists ultimo_marco jsonb,
    add column if not exists marcos_count integer not null default 0,
    add column if not exists maior_intervalo real not null default 0;
