// Funcao "partida" do ranking. O jogo chama com o login anonimo do jogador:
//   { acao: 'comecar' }                                   -> { id }
//   { acao: 'terminar', id, troncos, granulados, altura } -> { situacao, posicao, motivo }
//   { acao: 'apelido', apelido }                          -> { ok, apelido, motivo }
// So ela grava nas tabelas (com a chave de servico). O tempo de cada partida e medido aqui, pelo relogio do
// servidor, entre o 'comecar' e o 'terminar'.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { conferirApelido, conferirPartida, limites } from './regras.ts';

const cabecalhos = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const responder = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), {
    status, headers: { ...cabecalhos, 'Content-Type': 'application/json' }
});

const banco = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Quem joga pela primeira vez ganha um apelido provisorio, que pode trocar no painel do ranking.
async function garantirJogador(id: string) {
    const { data } = await banco.from('jogadores').select('apelido').eq('id', id).maybeSingle();
    if (data) return data.apelido as string;
    const apelido = 'Gato ' + Math.floor(1000 + Math.random() * 9000);
    await banco.from('jogadores').insert({ id, apelido });
    return apelido;
}

Deno.serve(async (pedido) => {
    if (pedido.method === 'OPTIONS') return new Response('ok', { headers: cabecalhos });
    if (pedido.method !== 'POST') return responder({ erro: 'use POST' }, 405);
    const token = (pedido.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: login } = await banco.auth.getUser(token);
    const usuario = login && login.user;
    if (!usuario) return responder({ erro: 'sem login' }, 401);
    const corpo = await pedido.json().catch(() => ({}));

    if (corpo.acao === 'apelido') {
        const conferido = conferirApelido(corpo.apelido);
        if (!conferido.ok) return responder(conferido);
        await garantirJogador(usuario.id);
        await banco.from('jogadores').update({ apelido: conferido.apelido }).eq('id', usuario.id);
        return responder(conferido);
    }

    if (corpo.acao === 'comecar') {
        await garantirJogador(usuario.id);
        const umaHoraAtras = new Date(Date.now() - 3600 * 1000).toISOString();
        const { count } = await banco.from('partidas').select('id', { count: 'exact', head: true })
            .eq('jogador', usuario.id).gte('inicio', umaHoraAtras);
        if ((count || 0) >= limites.partidasPorHora) return responder({ erro: 'partidas demais nesta hora' }, 429);
        // So uma partida aberta por vez: a anterior, se ficou aberta, nao conta mais.
        await banco.from('partidas').update({ situacao: 'recusada', motivo: 'nao terminada' })
            .eq('jogador', usuario.id).eq('situacao', 'aberta');
        const { data, error } = await banco.from('partidas').insert({ jogador: usuario.id }).select('id').single();
        if (error) return responder({ erro: 'nao deu para comecar' }, 500);
        return responder({ id: data.id });
    }

    if (corpo.acao === 'terminar') {
        const { data: partida } = await banco.from('partidas').select('id, inicio, situacao')
            .eq('id', corpo.id).eq('jogador', usuario.id).maybeSingle();
        if (!partida || partida.situacao !== 'aberta') return responder({ situacao: 'recusada', motivo: 'partida desconhecida' });
        const segundos = (Date.now() - new Date(partida.inicio).getTime()) / 1000;
        const placar = { troncos: corpo.troncos, granulados: corpo.granulados, altura: corpo.altura };
        const conferido = conferirPartida(placar, segundos);
        const numeros = conferido.aceita ? placar : { troncos: null, granulados: null, altura: null };
        await banco.from('partidas').update({
            ...numeros, fim: new Date().toISOString(),
            situacao: conferido.aceita ? 'aceita' : 'recusada', motivo: conferido.motivo || null
        }).eq('id', partida.id);
        if (!conferido.aceita) return responder({ situacao: 'recusada', motivo: conferido.motivo });
        const { data: lugar } = await banco.from('ranking').select('posicao, troncos').eq('jogador', usuario.id).maybeSingle();
        return responder({ situacao: 'aceita', posicao: lugar ? lugar.posicao : null, melhor: lugar ? lugar.troncos : null });
    }

    return responder({ erro: 'acao desconhecida' }, 400);
});
