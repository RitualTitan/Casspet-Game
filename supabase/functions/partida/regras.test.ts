// Testes das regras do ranking: node --experimental-strip-types supabase/functions/partida/regras.test.ts
import { conferirPartida, conferirApelido, conferirMarco, chaveApelido } from './regras.ts';

let falhas = 0;
const esperar = (nome: string, obtido: unknown, esperado: unknown) => {
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) falhas++;
    console.log(ok ? 'ok  ' : 'FALHOU', nome, ok ? '' : `(veio ${JSON.stringify(obtido)})`);
};
const aceita = (troncos: unknown, granulados: unknown, altura: unknown, segundos: number) =>
    conferirPartida({ troncos, granulados, altura }, segundos).aceita;

// Jogos honestos: comeco lento, velocidade maxima com combo x3 e partida longa.
esperar('comeco honesto', aceita(12, 9, 2700, 25), true);
esperar('velocidade maxima com combo', aceita(300, 600, 70000, 260), true);
esperar('partida de 10 minutos', aceita(900, 1800, 210000, 600), true);
// O que o hacker fez.
esperar('8,6e+118 granulados', aceita(0, 8.6e118, 0, 30), false);
esperar('troncos e+35', aceita(8e35, 10, 0, 30), false);
esperar('troncos demais para o tempo', aceita(500, 100, 100000, 60), false);
esperar('granulados demais', aceita(50, 900, 10000, 60), false);
esperar('voou sem pousar', aceita(10, 5, 400000, 60), false);
esperar('numero quebrado', aceita(10.5, 5, 100, 60), false);
esperar('texto no lugar de numero', aceita('10', 5, 100, 60), false);
esperar('negativo', aceita(-1, 5, 100, 60), false);
esperar('partida aberta por horas', aceita(10, 5, 2000, 7200), false);
// Apelidos.
esperar('apelido bom', conferirApelido('  Gato   Veloz ').apelido, 'Gato Veloz');
esperar('apelido curto', conferirApelido('ab').ok, false);
esperar('apelido com simbolo', conferirApelido('<script>').ok, false);
esperar('apelido feio', conferirApelido('PoRRa123').ok, false);
esperar('apelido com acento', conferirApelido('João_99').ok, true);
esperar('apelido cirilico sosia', conferirApelido('аdmin').ok, false); // "а" cirilico, imita "admin"
esperar('apelido grego sosia', conferirApelido('Gатo').ok, false); // mistura latino e cirilico
esperar('apelido so numeros', conferirApelido('1234').ok, false);
esperar('apelido com numero e letra', conferirApelido('Gato7').ok, true);

// Chave do apelido (para a trava de unico): maiuscula e acento nao criam apelido novo.
esperar('chave ignora maiuscula/acento', chaveApelido('Gáto'), chaveApelido('gato'));
esperar('chave difere nomes diferentes', chaveApelido('gato') === chaveApelido('gata'), false);

// Pontos de controle (marcos): trecho honesto passa; salto no trecho e recuo sao recusados.
const marco = (a: [number, number, number], b: [number, number, number], dt: number) =>
    conferirMarco({ troncos: a[0], granulados: a[1], altura: a[2] }, { troncos: b[0], granulados: b[1], altura: b[2] }, dt).ok;
esperar('trecho honesto', marco([10, 8, 2000], [30, 30, 9000], 12), true); // subiu 20 troncos em 12 s
esperar('trecho salto de troncos', marco([10, 8, 2000], [200, 30, 9000], 12), false);
esperar('trecho troncos diminuiu', marco([30, 30, 9000], [20, 30, 9000], 12), false);
esperar('trecho altura diminuiu', marco([30, 30, 9000], [30, 30, 8000], 12), false);
esperar('trecho granulados caiu (bicada) ok', marco([30, 30, 9000], [32, 22, 9500], 12), true);
esperar('trecho parado ok', marco([30, 30, 9000], [30, 30, 9000], 10), true);
esperar('trecho granulados demais', marco([10, 8, 2000], [12, 400, 3000], 12), false);
esperar('primeiro marco do zero', marco([0, 0, 0], [15, 12, 4000], 10), true);

if (falhas) {
    console.log(falhas + ' teste(s) falharam');
    process.exit(1);
}
console.log('todos os testes passaram');
