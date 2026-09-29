// Funcao "partida" do ranking. O jogo chama com o login anonimo do jogador:
//   { acao: 'comecar' }                                   -> { id }
//   { acao: 'marco', id, troncos, granulados, altura }    -> { ok }        (ponto de controle no meio da partida)
//   { acao: 'terminar', id, troncos, granulados, altura } -> { situacao, posicao, motivo }
//   { acao: 'apelido', apelido }                          -> { ok, apelido, motivo }
// So ela grava nas tabelas (com a chave de servico). O tempo de cada partida e medido aqui, pelo relogio do
// servidor, entre o 'comecar' e o 'terminar'; os marcos no meio provam que a partida foi jogada de verdade.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chaveApelido, conferirApelido, conferirMarco, conferirPartida, limites } from './regras.ts';

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
// O apelido e unico (apelido_chave), entao o provisorio tenta alguns nomes ate achar um livre.
async function garantirJogador(id: string) {
    const { data } = await banco.from('jogadores').select('apelido').eq('id', id).maybeSingle();
    if (data) return data.apelido as string;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
        const apelido = tentativa < 5 ? 'Gato ' + Math.floor(1000 + Math.random() * 9000) : 'Gato ' + id.slice(0, 8);
        const { error } = await banco.from('jogadores').insert({ id, apelido, apelido_chave: chaveApelido(apelido) });
        if (!error) return apelido;
        // 23505 = conflito de unicidade. No id, outra chamada ja criou o jogador (corrida): usa o que existe.
        // No apelido, o nome provisorio colidiu: tenta outro.
        if (error.code === '23505') {
            const { data: agora } = await banco.from('jogadores').select('apelido').eq('id', id).maybeSingle();
            if (agora) return agora.apelido as string;
            continue;
        }
        break;
    }
    return 'Gato';
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
        const { error } = await banco.from('jogadores')
            .update({ apelido: conferido.apelido, apelido_chave: chaveApelido(conferido.apelido) })
            .eq('id', usuario.id);
        if (error) {
            if (error.code === '23505') return responder({ ok: false, apelido: conferido.apelido, motivo: 'Esse apelido já está em uso.' });
            return responder({ ok: false, apelido: conferido.apelido, motivo: 'Não deu para salvar.' });
        }
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

    // Ponto de controle no meio da partida. Confere o trecho desde o marco anterior pelo relogio do servidor:
    // um salto de progresso maior que o possivel no tempo derruba a partida na hora.
    if (corpo.acao === 'marco') {
        const { data: partida } = await banco.from('partidas')
            .select('id, inicio, situacao, ultimo_marco, marcos_count, maior_intervalo')
            .eq('id', corpo.id).eq('jogador', usuario.id).maybeSingle();
        if (!partida || partida.situacao !== 'aberta') return responder({ ok: false, motivo: 'partida desconhecida' });
        const t = (Date.now() - new Date(partida.inicio).getTime()) / 1000;
        const anterior = partida.ultimo_marco || { t: 0, troncos: 0, granulados: 0, altura: 0 };
        const atual = { troncos: corpo.troncos, granulados: corpo.granulados, altura: corpo.altura };
        const dt = t - anterior.t;
        const conf = conferirMarco(anterior, atual, dt);
        if (!conf.ok) {
            await banco.from('partidas').update({ situacao: 'recusada', motivo: conf.motivo, fim: new Date().toISOString() })
                .eq('id', partida.id);
            return responder({ ok: false, motivo: conf.motivo });
        }
        await banco.from('partidas').update({
            ultimo_marco: { t, troncos: atual.troncos, granulados: atual.granulados, altura: atual.altura },
            marcos_count: (partida.marcos_count || 0) + 1,
            maior_intervalo: Math.max(partida.maior_intervalo || 0, dt)
        }).eq('id', partida.id);
        return responder({ ok: true });
    }

    if (corpo.acao === 'terminar') {
        const { data: partida } = await banco.from('partidas')
            .select('id, inicio, situacao, ultimo_marco, maior_intervalo')
            .eq('id', corpo.id).eq('jogador', usuario.id).maybeSingle();
        if (!partida || partida.situacao !== 'aberta') return responder({ situacao: 'recusada', motivo: 'partida desconhecida' });
        const segundos = (Date.now() - new Date(partida.inicio).getTime()) / 1000;
        const placar = { troncos: corpo.troncos, granulados: corpo.granulados, altura: corpo.altura };
        const conferido = conferirPartida(placar, segundos);

        // Pontos de controle: o placar final tem de caber no ultimo trecho (nada de pular no fim) e a partida
        // precisa ter sido acompanhada por marcos, sem um buraco maior que intervaloMaximo. Se o placar e
        // possivel mas faltaram marcos, o jogador provavelmente ficou sem internet: conta como offline, nao
        // como trapaca.
        const anterior = partida.ultimo_marco || { t: 0, troncos: 0, granulados: 0, altura: 0 };
        const dtFinal = segundos - anterior.t;
        const finalOk = conferirMarco(anterior, placar, dtFinal).ok;
        const coberta = Math.max(partida.maior_intervalo || 0, dtFinal) <= limites.intervaloMaximo;

        let situacao = 'aceita';
        let motivo = '';
        if (!conferido.aceita) { situacao = 'recusada'; motivo = conferido.motivo; }
        else if (!finalOk) { situacao = 'recusada'; motivo = 'final incoerente'; }
        else if (!coberta) { situacao = 'recusada'; motivo = 'sem marcos'; }

        const numeros = situacao === 'aceita' ? placar : { troncos: null, granulados: null, altura: null };
        await banco.from('partidas').update({
            ...numeros, fim: new Date().toISOString(), situacao, motivo: motivo || null
        }).eq('id', partida.id);

        if (situacao === 'aceita') {
            const { data: lugar } = await banco.from('ranking').select('posicao, troncos').eq('jogador', usuario.id).maybeSingle();
            return responder({ situacao: 'aceita', posicao: lugar ? lugar.posicao : null, melhor: lugar ? lugar.troncos : null });
        }
        // Faltou acompanhar a partida (sem internet no meio): mostra como offline, nao como recusada.
        if (motivo === 'sem marcos') return responder({ situacao: 'offline', motivo });
        return responder({ situacao: 'recusada', motivo });
    }

    return responder({ erro: 'acao desconhecida' }, 400);
});
