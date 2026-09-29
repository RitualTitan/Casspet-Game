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
    partidasPorHora: 60,
    // Pontos de controle: o jogo manda um marco a cada ~10 s. Se ficar mais de intervaloMaximo sem marco
    // (inclusive do comeco ao 1o e do ultimo ao fim), a partida nao foi acompanhada e nao entra no ranking.
    intervaloMaximo: 40
};

export type Placar = { troncos: unknown; granulados: unknown; altura: unknown };
export type Marco = { troncos: number; granulados: number; altura: number };

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

// Confere um trecho da partida (entre dois marcos, ou do ultimo marco ate o fim): o progresso so cresce e
// cabe nos mesmos limites por segundo, agora contando so o tempo do trecho. Assim nao adianta ficar parado e
// dar um salto: cada pedaco e conferido pelo relogio do servidor. A folga por trecho absorve o vaivem da rede.
export function conferirMarco(anterior: Marco, atual: Placar, dt: number): { ok: boolean; motivo: string } {
    const { troncos, granulados, altura } = atual;
    if (!inteiroValido(troncos) || !inteiroValido(granulados) || !inteiroValido(altura)) {
        return { ok: false, motivo: 'numeros invalidos' };
    }
    if (!(dt >= 0)) return { ok: false, motivo: 'tempo invalido' };
    const dTroncos = troncos - anterior.troncos;
    const dGranulados = granulados - anterior.granulados;
    const dAltura = altura - anterior.altura;
    // Troncos e altura so sobem. Granulados podem cair (a bicada do passaro derruba granulados do gato),
    // entao para eles conferimos so quanto pode ter subido, nunca a queda.
    if (dTroncos < 0 || dAltura < 0) return { ok: false, motivo: 'placar diminuiu' };
    if (dTroncos > dt * limites.troncosPorSegundo + 3) return { ok: false, motivo: 'troncos demais para o tempo' };
    if (dGranulados > dTroncos * limites.granuladosPorTronco + dt * limites.granuladosPorSegundo + 15) {
        return { ok: false, motivo: 'granulados demais' };
    }
    if (dAltura > dTroncos * limites.alturaPorTronco + 1500) return { ok: false, motivo: 'altura demais' };
    return { ok: true, motivo: '' };
}

// Chave para comparar apelidos: minusculas e sem acento. "Gato", "gato" e "gáto" contam como um so,
// para ninguem copiar o apelido de outro trocando maiuscula ou acento.
function normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}
export function chaveApelido(apelido: string): string {
    return normalizar(apelido);
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
    const comparar = ' ' + normalizar(apelido) + ' ';
    if (proibidas.some((palavra) => comparar.includes(palavra))) return { ok: false, apelido, motivo: 'Escolha outro apelido.' };
    return { ok: true, apelido, motivo: '' };
}
