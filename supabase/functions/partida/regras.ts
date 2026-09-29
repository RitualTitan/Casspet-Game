// Regras que o servidor usa para aceitar uma partida no ranking. O tempo vem do relogio do servidor
// (inicio anotado quando o jogo avisou que comecou), entao o jogador nao consegue inventar tempo.
// Os limites sao os mesmos do vigia do jogo (troncosPorSegundo etc. no GameV2.js): mude os dois juntos.
export const limites = {
    troncosPorSegundo: 2.2,
    granuladosPorTronco: 3,
    granuladosPorSegundo: 0.6,
    alturaPorTronco: 360,
    // Uma partida aberta por mais de uma hora nao entra (quem deixa aberto para "ganhar tempo").
    duracaoMaxima: 3600,
    partidasPorHora: 60
};

export type Placar = { troncos: unknown; granulados: unknown; altura: unknown };

const inteiroValido = (valor: unknown): valor is number =>
    typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 1_000_000;

export function conferirPartida(placar: Placar, segundos: number): { aceita: boolean; motivo: string } {
    const { troncos, granulados, altura } = placar;
    if (!inteiroValido(troncos) || !inteiroValido(granulados) || !inteiroValido(altura)) {
        return { aceita: false, motivo: 'numeros invalidos' };
    }
    if (!(segundos > 0) || segundos > limites.duracaoMaxima) return { aceita: false, motivo: 'tempo de partida invalido' };
    if (troncos > segundos * limites.troncosPorSegundo + 5) return { aceita: false, motivo: 'troncos demais para o tempo' };
    if (granulados > troncos * limites.granuladosPorTronco + segundos * limites.granuladosPorSegundo + 30) {
        return { aceita: false, motivo: 'granulados demais' };
    }
    if (altura > troncos * limites.alturaPorTronco + 3000) return { aceita: false, motivo: 'altura demais' };
    return { aceita: true, motivo: '' };
}

// Palavras que nao podem aparecer no apelido (o time pode completar a lista).
const proibidas = ['porra', 'caralho', 'merda', 'puta', 'buceta', 'cu ', 'viado', 'fdp', 'pqp', 'foda', 'cacete', 'bosta'];

export function conferirApelido(texto: unknown): { ok: boolean; apelido: string; motivo: string } {
    const apelido = String(texto ?? '').replace(/\s+/g, ' ').trim();
    if (apelido.length < 3 || apelido.length > 16) return { ok: false, apelido, motivo: 'Use de 3 a 16 letras.' };
    // So letras latinas (com acento), numeros, espaco, ponto, - e _. Nada de misturar alfabetos: o "a"
    // cirilico e o "a" latino sao parecidos e deixariam alguem imitar o apelido de outro no ranking.
    if (!/^[\p{Script=Latin}0-9 _.-]+$/u.test(apelido)) return { ok: false, apelido, motivo: 'Só letras (sem misturar alfabetos), números, espaço, ponto, - e _.' };
    // Pelo menos uma letra, para o apelido nao se confundir com o numero do lugar no ranking.
    if (!/\p{Script=Latin}/u.test(apelido)) return { ok: false, apelido, motivo: 'Use pelo menos uma letra.' };
    const comparar = ' ' + apelido.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
    if (proibidas.some((palavra) => comparar.includes(palavra))) return { ok: false, apelido, motivo: 'Escolha outro apelido.' };
    return { ok: true, apelido, motivo: '' };
}
