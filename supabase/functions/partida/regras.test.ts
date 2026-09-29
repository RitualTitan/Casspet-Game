// Testes das regras do ranking: node --experimental-strip-types supabase/functions/partida/regras.test.ts
import { conferirPartida, conferirApelido } from './regras.ts';

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
if (falhas) {
    console.log(falhas + ' teste(s) falharam');
    process.exit(1);
}
console.log('todos os testes passaram');
