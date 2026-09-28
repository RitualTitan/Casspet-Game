// Monta a pasta site/ com o que vai para o repositorio publico (RitualTitan/Casspet-Game, que o
// GitHub Pages publica): o jogo com o GameV2.js embaralhado e so as imagens que ele carrega, sem as
// ferramentas, as artes originais e as anotacoes. Roda sozinho na acao .github/workflows/publicar.yml.
// Para testar no computador:
//   npm install --no-save --no-package-lock javascript-obfuscator@4.2.2
//   node ferramentas/publicar.js
//   python -m http.server 8002 --directory site
const fs = require('fs');
const path = require('path');
const ofuscador = require('javascript-obfuscator');

const raiz = path.join(__dirname, '..');
const saida = path.join(raiz, 'site');
const arquivosSite = ['index.html', 'manifest.webmanifest', 'sw.js'];
// Pastas que o jogo carrega por nome montado no codigo (faixas do cenario, poses, bichos da loja).
// Uma imagem nova fora delas precisa aparecer inteira entre aspas no GameV2.js, como 'assets/x.webp'.
const pastasSite = ['assets/cenario', 'assets/gato', 'assets/bichos', 'assets/especiais', 'assets/icone'];

// Deixa o codigo ilegivel: textos cifrados numa tabela, nomes trocados e parte do fluxo embaralhado.
// O fluxo so e embaralhado em 30% dos trechos, para o jogo continuar leve no celular.
const opcoesOfuscador = {
    compact: true,
    identifierNamesGenerator: 'hexadecimal',
    stringArray: true,
    stringArrayEncoding: ['rc4'],
    stringArrayThreshold: 1,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    splitStrings: true,
    splitStringsChunkLength: 6,
    transformObjectKeys: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3
};

function copiar(relativo) {
    const origem = path.join(raiz, relativo);
    if (!fs.existsSync(origem)) throw new Error('Arquivo do jogo nao encontrado: ' + relativo);
    fs.cpSync(origem, path.join(saida, relativo), { recursive: true });
}

// Caminhos 'assets/...' com extensao escritos entre aspas no codigo, no index.html e no manifesto.
function assetsCitados(textos) {
    const achados = new Set();
    for (const texto of textos) {
        for (const [, caminho] of texto.matchAll(/["'`](assets\/[^"'`$]+\.[a-z0-9]+)["'`]/gi)) achados.add(caminho);
    }
    return [...achados].filter((caminho) => !pastasSite.some((pasta) => caminho.startsWith(pasta + '/')));
}

fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida);

const codigo = fs.readFileSync(path.join(raiz, 'GameV2.js'), 'utf8');
const embaralhado = ofuscador.obfuscate(codigo, opcoesOfuscador).getObfuscatedCode();
// A chave da assinatura dos dados salvos nao pode aparecer legivel no site.
const segredo = (codigo.match(/const segredoAssinatura = '([^']+)'/) || [])[1];
if (segredo && embaralhado.includes(segredo)) throw new Error('A chave da assinatura ficou legivel no GameV2.js publicado.');
fs.writeFileSync(path.join(saida, 'GameV2.js'), embaralhado);

const textos = [codigo, ...arquivosSite.map((arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8'))];
const assets = assetsCitados(textos);
for (const relativo of [...arquivosSite, ...pastasSite, ...assets]) copiar(relativo);

// Sem Jekyll: o GitHub Pages serve os arquivos como estao.
fs.writeFileSync(path.join(saida, '.nojekyll'), '');
fs.writeFileSync(path.join(saida, 'README.md'),
    '# Granulando (Casspet®)\n\nVersao publicada do jogo: https://ritualtitan.github.io/Casspet-Game/\n\n' +
    'Este repositorio e gerado automaticamente. Nao edite aqui: cada publicacao apaga o que estiver nele.\n');

const tamanho = (pasta) => fs.readdirSync(pasta, { withFileTypes: true }).reduce((soma, item) => {
    const caminho = path.join(pasta, item.name);
    return soma + (item.isDirectory() ? tamanho(caminho) : fs.statSync(caminho).size);
}, 0);
console.log(`site/ pronto: ${assets.length} imagens soltas + ${pastasSite.length} pastas, ` +
    `${(tamanho(saida) / 1048576).toFixed(1)} MB; GameV2.js ${(codigo.length / 1024).toFixed(0)} KB -> ` +
    `${(embaralhado.length / 1024).toFixed(0)} KB embaralhado.`);
