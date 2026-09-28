// Todo o jogo fica dentro desta funcao para nao ficar exposto no console do navegador
// (quem digitasse "game" la podia mexer em tudo). Os testes e a previa tiram esta embalagem.
(() => {

const telaDeToque = window.matchMedia('(pointer: coarse)').matches;
// A altura do mundo acompanha o formato da tela: 640 em 9:16 e ate 860 nos
// celulares mais altos. Telas mais largas que 9:16 ganham faixas nas laterais.
const alturaTela = medirAlturaTela();
// Desenha perto da resolucao real da tela (pixels do aparelho), para os contornos ficarem lisos
// em vez de esticados e serrilhados. O teto de 2,5 limita o custo de preenchimento no celular.
const escalaRenderizacao = medirEscalaRenderizacao();
// As poses do gato e dos bichos tem 512 x 512; as posicoes em cabecaGato estao numa grade de 2048.
const tamanhoPose = 512;
// Largura da textura do granulado (assets/granulado.webp e o dourado, carregado nesse tamanho).
const larguraGranulado = 256;
// As tabuas de madeira sao desenhadas em 3x e exibidas com escala 1/3, para ficarem nitidas.
const escalaMadeira = 3;
// Gravidade na velocidade inicial; o vigia anti-trapaca confere se ninguem mexeu nela.
const gravidadeBase = 300;
// "1 granulado", "2 granulados".
const contar = (quantidade, palavra) => `${quantidade} ${palavra}${quantidade === 1 ? '' : 's'}`;
const config = {
    type: Phaser.AUTO,
    render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    parent: 'jogo',
    width: 360,
    height: alturaTela,
    // Abaixo de 30 fps o jogo desacelera em vez de dar passos longos,
    // que deixariam o gato atravessar um tronco num engasgo do navegador.
    fps: { min: 30, smoothStep: true },
    physics: {
        default: 'arcade',
        arcade: {
            // Atualiza o movimento a cada quadro, inclusive em telas acima de 60 Hz.
            fixedStep: false,
            gravity: { y: gravidadeBase },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
    scale: {
        width: 360 * escalaRenderizacao,
        height: alturaTela * escalaRenderizacao,
        mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
// Fracao da largura da tela ocupada pela madeira em cada enquadramento.
const enquadramentoCenario = {
    abertura: 0.28,
    jogo: 0.40,
    duracao: 900
};
// Previa do cenario redesenhado (cenario-novo.html). No jogo oficial fica desligada.
const previaCenario = window.previaCenario === true;
// Medidas das faixas do cenario (iguais as da ferramenta que as gera). `larguraMadeira` e a
// largura, em px da arte, que o enquadramento trata como a madeira, e `esticamento` alarga a
// arte na horizontal; `fimCopa` e o tronco em que a copa do pinheiro sai da tela. O cenario novo
// (ferramentas/montar-cenario-ia.html, com as imagens geradas por IA) e 1,5x mais detalhado, nao e
// esticado e sobe no mesmo ritmo do antigo; a copa dele e mais baixa, entao sai da tela antes.
const texturaCenario = previaCenario ? {
    pasta: 'assets/cenario-novo', largura: 1024, altura: 12264, alturaFaixa: 2044, margem: 2,
    centroTronco: 512, larguraMadeira: 273.75, esticamento: 1, fimCopa: 157
} : {
    pasta: 'assets/cenario', largura: 1399, altura: 8192, alturaFaixa: 2044, margem: 2,
    centroTronco: 665, larguraMadeira: 182.5, esticamento: 1.15, fimCopa: 175
};
// Cada tronco fica em media 212 acima do anterior (190 a 235, em gerarPlataformas).
const alturaPorTronco = 212;
// O ceu e desenhado no jogo, atras do cenario, e muda pela altura alcancada, em troncos. O ceu fica parado em cada fase e
// muda nos ultimos `transicaoCeu` troncos antes da seguinte. topo, meio e base formam
// o degrade; luz tinge o cenario; sol e a altura do sol na tela (acima de 1 ja se pos);
// estrelas, lua e espaco vao de 0 a 1. As fases ficam fora dos multiplos de 20 para o
// aviso nao cobrir o de "MAIS RAPIDO!". A noite chega antes da copa do pinheiro do
// cenario, que ocupa a tela de ~110 a ~185 troncos.
const transicaoCeu = 14;
// Titulos que aparecem ao mudar de fase ("FIM DE TARDE", "ESPACO!"). Desligados para
// testar sem eles, a pedido do usuario; basta trocar para true para voltar.
const mostrarAvisosCeu = false;
const fasesCeu = [
    { troncos: 0, topo: 0x3f8bd8, meio: 0x5ca8e7, base: 0x9fd4f5, luz: 0xffffff,
        sol: 0.14, corSol: 0xfff6c8, estrelas: 0, lua: 0, espaco: 0 },
    { troncos: 30, aviso: ['FIM DE TARDE', 'o sol começa a descer'], cor: '#ffd98a',
        topo: 0x4a86cf, meio: 0x8fbfe6, base: 0xffd58f, luz: 0xfff0d6,
        sol: 0.4, corSol: 0xffe08a, estrelas: 0, lua: 0, espaco: 0 },
    { troncos: 65, aviso: ['PÔR DO SOL', 'o céu ficou alaranjado'], cor: '#ffa060',
        topo: 0x2e2a6c, meio: 0xb4507a, base: 0xff9448, luz: 0xffc6a2,
        sol: 0.85, corSol: 0xff7a3a, estrelas: 0.15, lua: 0, espaco: 0 },
    { troncos: 95, aviso: ['NOITE', 'as estrelas apareceram'], cor: '#b9c6ff',
        topo: 0x040a24, meio: 0x0c1a48, base: 0x243268, luz: 0x7a86b8,
        sol: 1.3, corSol: 0xff7a3a, estrelas: 0.85, lua: 1, espaco: 0 },
    { troncos: 150, aviso: ['ESPAÇO!', 'a árvore chegou ao espaço'], cor: '#ffffff',
        topo: 0x000000, meio: 0x02030a, base: 0x080c20, luz: 0x8a90b4,
        sol: 1.3, corSol: 0xff7a3a, estrelas: 1, lua: 1, espaco: 1 }
];
// A ultima fase e o espaco.
const faseEspaco = fasesCeu.length - 1;
// A copa do pinheiro sai de cima da tela por volta deste tronco; so dai o espaco comeca a andar.
const troncoFimCopa = texturaCenario.fimCopa;
// A partir de 160 troncos o jogo para de acelerar (3x a velocidade inicial).
const velocidadeMaxima = 3;
// Passaros inimigos aparecem a partir deste tronco; cada bicada derruba alguns granulados.
const troncoPassaros = 25;
const granuladosBicada = 3;
// Granulados que escapam do pacote quando o gato encosta no guaxinim distraido.
const granuladosSusto = 5;
// Interruptor: os poderes ficam desligados no jogo publicado ate o usuario decidir.
const ativarPoderes = false;
// Poderes em bolhas sobre alguns troncos: o primeiro perto de troncoPoderes, depois a cada 22 a 34.
const troncoPoderes = 12;
const poderes = {
    ima: { nome: 'ÍMÃ', dica: 'Puxa os granulados de perto', duracao: 9, cor: 0xff7a6a },
    escudo: { nome: 'ESCUDO', dica: 'Aguenta uma bicada', duracao: 20, cor: 0x7cc8ff },
    pacote: { nome: 'PACOTE FURADO', dica: 'Granulado em todos os troncos', duracao: 10, cor: 0xffd24a }
};
const raioIma = 150;
// Granulados pegos em sequencia, sem deixar nenhum para tras, valem x2 e depois x3.
const niveisCombo = [{ seguidos: 10, vale: 3 }, { seguidos: 5, vale: 2 }];
// Troncos especiais: a mola joga o gato bem alto; o balanco fica pendurado por cordas num galho.
const troncoMola = 30;
const troncoBalanco = 45;
const impulsoMola = 580;
// Superficie da grama do chao, onde ficam os pes do gato no comeco.
// Com essa altura a terra de assets/chao.webp cobre ate a borda de baixo da tela.
const alturaChao = alturaTela - 44;
// Posicao da superficie da grama dentro de assets/chao.webp (900 x 229 px).
const superficieChao = 104 / 229;
// A camera deixa sempre 340 de tela abaixo do gato, como em 9:16;
// em telas mais altas o espaco extra aparece acima dele.
const folgaAbaixoGato = 340;
const chaveRecorde = 'granulando.recorde';
// Anti-trapaca: o recorde vai lacrado e quem trapaceia leva uma peca do guaxinim e fica com nariz de
// palhaco (marcado em chavePerfil) ate subir troncosPerdao troncos numa partida limpa.
const chavePerfil = 'granulando.perfil';
const troncosPerdao = 50;
// Diametro do nariz de palhaco, em larguras da cabeca do gato.
const tamanhoNariz = 0.28;
const chaveMudo = 'granulando.mudo';
// Dicas da primeira vez: cada uma aparece uma unica vez neste aparelho.
const chaveDicas = 'granulando.dicas';
const dicasJogo = {
    rachado: 'Tronco rachado quebra depois do pulo!',
    passaro: 'Desvie do pássaro: a bicada derruba granulados',
    poder: 'Pegue a bolha para ganhar um poder!',
    mola: 'Pule na mola para ir bem alto!',
    combo: 'Granulados seguidos valem mais: não deixe passar!'
};
// Musica, efeitos e vibracao ligam e desligam separados (na pausa e em CONFIGURACOES).
const chaveOpcoes = 'granulando.opcoes';
// Cofrinho de granulados e itens da loja, salvos so neste aparelho.
const chaveLoja = 'granulando.loja';
// Missoes do dia: 3 sorteadas pela data (iguais para todo mundo no mesmo dia). "partida" vale o
// melhor numa partida; "dia" soma ao longo do dia. O premio cai no cofrinho ao cumprir.
const chaveMissoes = 'granulando.missoes';
const tiposMissao = {
    granulados: { modo: 'partida', metas: [30, 50, 80], premios: [40, 60, 90],
        texto: (n) => `Pegue ${n} granulados numa partida` },
    troncos: { modo: 'partida', metas: [30, 60, 100], premios: [40, 70, 110],
        texto: (n) => `Suba ${n} troncos numa partida` },
    semBicada: { modo: 'partida', metas: [40, 60, 80], premios: [60, 90, 120],
        texto: (n) => `Suba ${n} troncos sem levar bicada` },
    sustos: { modo: 'dia', metas: [1, 2, 3], premios: [40, 70, 100],
        texto: (n) => `Assuste o guaxinim ${n === 1 ? '1 vez' : n + ' vezes'}` },
    dourados: { modo: 'dia', metas: [1, 2, 3], premios: [40, 60, 90],
        texto: (n) => n === 1 ? 'Pegue 1 granulado dourado' : `Pegue ${n} granulados dourados` },
    partidas: { modo: 'dia', metas: [2, 3, 5], premios: [30, 50, 80],
        texto: (n) => `Jogue ${n} partidas` },
    seguidos: { modo: 'partida', metas: [8, 12, 16], premios: [40, 70, 100],
        texto: (n) => `Pegue ${n} granulados seguidos` },
    poderes: { modo: 'dia', metas: [1, 2, 3], premios: [30, 50, 70],
        texto: (n) => n === 1 ? 'Pegue 1 poder' : `Pegue ${n} poderes` }
};
// Sem poderes no jogo, a missao deles nao entra no sorteio.
if (!ativarPoderes) delete tiposMissao.poderes;
// Endereco publico do jogo, usado ao compartilhar o resultado.
const enderecoJogo = 'https://ritualtitan.github.io/Casspet-Game/';
// Os bichos sao o destaque da loja: animais que tambem usam o granulado. Sem arte ainda, ficam "em breve".
const itensLoja = {
    bichos: [
        { id: 'gato', nome: 'Gato', preco: 0 },
        { id: 'coelho', nome: 'Coelho', preco: 1500, arte: 'assets/bichos/coelho/' },
        { id: 'hamster', nome: 'Hamster', preco: 1500, emBreve: true },
        { id: 'passaro', nome: 'Pássaro', preco: 2000, emBreve: true },
        { id: 'porquinho', nome: 'Porquinho-da-índia', preco: 2500, emBreve: true },
        { id: 'iguana', nome: 'Iguana', preco: 3000, emBreve: true }
    ],
    pelagens: [
        { id: 'original', nome: 'Original', preco: 0, cor: 0xffffff },
        // A cor tinge o marrom do gato: da para escurecer e mudar o tom, nao clarear.
        { id: 'cinza', nome: 'Cinza', preco: 150, cor: 0xc6c6d2 },
        { id: 'ruiva', nome: 'Ruiva', preco: 250, cor: 0xffb070 },
        { id: 'dourada', nome: 'Dourada', preco: 350, cor: 0xffd86a },
        { id: 'chocolate', nome: 'Chocolate', preco: 450, cor: 0xa0705a },
        { id: 'escura', nome: 'Escura', preco: 600, cor: 0x6f6878 }
    ],
    acessorios: [
        { id: 'nenhum', nome: 'Nenhum', preco: 0 },
        { id: 'bone', nome: 'Boné', preco: 100 },
        { id: 'oculos', nome: 'Óculos', preco: 200 },
        { id: 'bandana', nome: 'Bandana Casspet', preco: 300 },
        { id: 'coroa', nome: 'Coroa', preco: 700 },
        { id: 'capacete', nome: 'Capacete espacial', preco: 1000 }
    ]
};
// As 4 poses: chave da textura do gato e nome do arquivo de cada bicho em assets/bichos/<id>/.
// As imagens dos bichos tem 512 x 512, como as do gato, com os pes na mesma altura.
const posesBicho = { mascote_1: 'parado', quasePulando: 'quasePulando', pulando: 'pulando', caindo: 'caindo' };
// Onde cada acessorio fica em cada pose do gato, em pixels das imagens de 2048: topo da
// cabeca, meio dos olhos e pescoco, a largura da cabeca e a inclinacao dela.
const cabecaGato = {
    mascote_1: { topo: [1048, 660], olhos: [1160, 916], pescoco: [1072, 1200], largura: 820, angulo: -5 },
    machucado: { topo: [1132, 520], olhos: [1172, 888], pescoco: [1140, 1280], largura: 920, angulo: 10 },
    quasePulando: { topo: [1340, 700], olhos: [1488, 1008], pescoco: [1320, 1272], largura: 840, angulo: 5 },
    pulando: { topo: [1020, 300], olhos: [1212, 640], pescoco: [1160, 1060], largura: 1060, angulo: -10 },
    caindo: { topo: [1020, 420], olhos: [1152, 728], pescoco: [1140, 1072], largura: 920, angulo: -8 }
};
// Focinho (na grade de 2048) e largura da cabeca dos outros bichos, para o nariz de palhaco do trapaceiro.
// Um bicho novo com arte precisa entrar aqui, senao o nariz some quando ele e o escolhido.
const narizBichos = {
    coelho_mascote_1: { ponto: [1050, 912], largura: 760 },
    coelho_quasePulando: { ponto: [1551, 1121], largura: 760 },
    coelho_pulando: { ponto: [1280, 778], largura: 720 },
    coelho_caindo: { ponto: [1085, 882], largura: 760 }
};
// Ponto de apoio, tamanho (em larguras de cabeca) e origem da textura de cada acessorio.
const encaixeAcessorio = {
    bone: { ponto: 'topo', largura: 1.15, origem: [0.42, 0.78] },
    oculos: { ponto: 'olhos', largura: 0.95, origem: [0.5, 0.5] },
    bandana: { ponto: 'pescoco', largura: 0.8, origem: [0.5, 0.2] },
    coroa: { ponto: 'topo', largura: 0.6, origem: [0.5, 0.85] },
    capacete: { ponto: 'centro', largura: 1.6, origem: [0.5, 0.5] }
};
const corTexto = '#ffe1a6';
const corMadeiraEscura = 0x382017;
// Recortes da pagina de quadrinhos (assets/historia.webp, 1333 x 2000), em ordem de leitura.
const quadrosHistoria = [
    { x: 0, y: 0, largura: 658, altura: 613, efeito: 'feliz',
        texto: 'Era um dia tranquilo. O gatinho estava todo feliz com seu pacote novo de Granulado de Madeira Casspet®.' },
    { x: 676, y: 0, largura: 657, altura: 613, efeito: 'suspense',
        texto: 'Mas alguém estava espiando pela janela...' },
    { x: 0, y: 622, largura: 658, altura: 631, efeito: 'roubo',
        texto: 'O guaxinim roubou o pacote e fugiu correndo, derrubando granulados pelo caminho!' },
    { x: 676, y: 622, largura: 657, altura: 631, efeito: 'fuga',
        texto: 'Ele escalou a árvore mais alta da floresta, espalhando granulados pelos troncos.' },
    { x: 0, y: 1263, largura: 658, altura: 737, efeito: 'risada',
        texto: 'Lá de cima, o guaxinim ainda deu risada. O gatinho ficou sem fôlego só de olhar...' },
    { x: 676, y: 1263, largura: 657, altura: 737, efeito: 'final',
        texto: 'Mas esse gatinho não desiste! Pule de tronco em tronco, recupere os granulados e alcance o guaxinim!' }
];
const game = new Phaser.Game(config);

function medirEscalaRenderizacao() {
    const area = document.getElementById('jogo');
    const largura = (area && area.clientWidth) || window.innerWidth;
    const altura = (area && area.clientHeight) || window.innerHeight;
    const pixels = Math.min(largura / 360, altura / alturaTela) * (window.devicePixelRatio || 1);
    return Phaser.Math.Clamp(Math.round(pixels * 4) / 4, telaDeToque ? 1.5 : 2, 2.5);
}

function medirAlturaTela() {
    const area = document.getElementById('jogo');
    const largura = (area && area.clientWidth) || window.innerWidth;
    const altura = (area && area.clientHeight) || window.innerHeight;
    return Math.round(Phaser.Math.Clamp(360 * altura / largura, 640, 860));
}

// Recorde, cofrinho e missoes sao salvos com uma assinatura (hash dos dados com uma chave do
// jogo). Quem editar esses valores pelo navegador quebra a assinatura: o dado e jogado fora e o
// trapaceiro ganha o nariz de palhaco. Nao segura quem copiar a assinatura do codigo publico.
const chavesAssinadas = [chaveRecorde, chaveLoja, chaveMissoes];
const segredoAssinatura = 'casspet-granulando-cofrinho';
// Cofrinho sem assinatura (salvo por uma versao antiga) so e aceito ate este valor, somando o
// saldo e o preco do que ja foi comprado. A loja e nova; acima disso e cofrinho escrito a mao.
const limiteCofrinhoAntigo = 10000;

// Hash de 53 bits (cyrb53), rapido e sem depender de nada do navegador.
function assinar(chave, texto) {
    const entrada = segredoAssinatura + '|' + chave + '|' + texto;
    let h1 = 0xdeadbeef ^ entrada.length, h2 = 0x41c6ce57 ^ entrada.length;
    for (let i = 0; i < entrada.length; i++) {
        const c = entrada.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const estaAssinado = (salvo) => salvo !== null && typeof salvo === 'object' &&
    'assinatura' in salvo && 'dados' in salvo;

// O armazenamento pode falhar em aba anonima; o jogo segue sem salvar.
function lerArmazenado(chave, padrao) {
    try {
        const valor = localStorage.getItem(chave);
        if (valor === null) return padrao;
        const salvo = JSON.parse(valor);
        if (!chavesAssinadas.includes(chave)) return salvo;
        if (estaAssinado(salvo)) {
            if (salvo.assinatura === assinar(chave, JSON.stringify(salvo.dados))) return salvo.dados;
            pegarAdulterado(chave);
            return padrao;
        }
        // Sem assinatura: veio de uma versao antiga do jogo ou foi escrito a mao. As missoes do dia
        // recomecam; o recorde passa pelo lacre de lerRecorde; o cofrinho, se for possivel.
        if (chave === chaveMissoes) {
            localStorage.removeItem(chave);
            return padrao;
        }
        if (chave === chaveLoja && valorLoja(salvo) > limiteCofrinhoAntigo) {
            pegarAdulterado(chave);
            return padrao;
        }
        salvarArmazenado(chave, salvo);
        return salvo;
    } catch (erro) {
        return padrao;
    }
}

// Dado mexido a mao: some, e quem mexeu fica com o nariz de palhaco.
function pegarAdulterado(chave) {
    localStorage.removeItem(chave);
    marcarTrapaceiro();
}

// Saldo mais o preco de tudo que ja foi comprado.
function valorLoja(salvo) {
    const comprados = salvo && Array.isArray(salvo.comprados) ? salvo.comprados : [];
    let valor = Math.max(0, Number(salvo && salvo.saldo) || 0);
    for (const grupo of Object.values(itensLoja)) {
        for (const item of grupo) if (comprados.includes(item.id)) valor += item.preco;
    }
    return valor;
}

function salvarArmazenado(chave, valor) {
    try {
        const texto = chavesAssinadas.includes(chave)
            ? JSON.stringify({ dados: valor, assinatura: assinar(chave, JSON.stringify(valor)) })
            : JSON.stringify(valor);
        localStorage.setItem(chave, texto);
    } catch (erro) {
        // Sem armazenamento disponivel.
    }
}

// Confere tudo ao abrir o jogo, antes do menu: o que veio de versoes antigas passa a ir assinado
// (quem ja jogava nao perde nada) e o que foi mexido ja poe o nariz de palhaco na pintura do menu.
for (const chave of chavesAssinadas) lerArmazenado(chave, null);

function diaDeHoje() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;
}

// As 3 missoes do dia, sempre as mesmas para a mesma data.
function missoesDoDia(dia = diaDeHoje()) {
    let semente = 0;
    for (const letra of dia) semente = (semente * 31 + letra.charCodeAt(0)) >>> 0;
    const aleatorio = () => {
        semente = (semente + 0x6d2b79f5) >>> 0;
        let t = semente;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const chaves = Object.keys(tiposMissao);
    const escolhidas = [];
    while (escolhidas.length < 3) {
        const chave = chaves[Math.floor(aleatorio() * chaves.length)];
        if (!escolhidas.includes(chave)) escolhidas.push(chave);
    }
    return escolhidas.map((chave) => {
        const tipo = tiposMissao[chave];
        const nivel = Math.floor(aleatorio() * tipo.metas.length);
        return { id: chave, modo: tipo.modo, meta: tipo.metas[nivel], premio: tipo.premios[nivel], texto: tipo.texto(tipo.metas[nivel]) };
    });
}

// Progresso salvo; num dia novo comeca do zero.
function lerProgressoMissoes() {
    const salvo = lerArmazenado(chaveMissoes, null);
    const dia = diaDeHoje();
    if (salvo && salvo.dia === dia) return salvo;
    return { dia, progresso: {}, feitas: [] };
}

// Avanca uma missao: em "partida" guarda o melhor valor, em "dia" soma. Paga o premio ao cumprir.
function registrarMissao(cena, id, valor) {
    if (cena.trapaca) return;
    const missao = missoesDoDia().find((item) => item.id === id);
    if (!missao) return;
    const estado = lerProgressoMissoes();
    if (estado.feitas.includes(id)) return;
    const atual = estado.progresso[id] || 0;
    estado.progresso[id] = missao.modo === 'dia' ? atual + valor : Math.max(atual, valor);
    if (estado.progresso[id] >= missao.meta) {
        estado.feitas.push(id);
        const loja = lerLoja();
        loja.saldo += missao.premio;
        salvarLoja(loja);
        cena.loja = loja;
        if (cena.iniciado && !cena.morreu) {
            mostrarFaixa(cena, 'MISSÃO CUMPRIDA!', `+${missao.premio} granulados no cofrinho`, '#ffd24a');
            som.recorde();
        }
    }
    salvarArmazenado(chaveMissoes, estado);
}

// Copia da loja nesta aba: vale mesmo quando o navegador nao deixa salvar (aba anonima).
let lojaEmMemoria = null;

function lerLoja() {
    const salvo = lojaEmMemoria || lerArmazenado(chaveLoja, {}) || {};
    const comprados = Array.isArray(salvo.comprados) ? salvo.comprados : [];
    const equipado = salvo.equipado || {};
    const valido = (grupo, id) => itensLoja[grupo].some((item) => item.id === id) &&
        (comprados.includes(id) || itensLoja[grupo].find((item) => item.id === id).preco === 0);
    return {
        saldo: Math.max(0, Math.floor(Number(salvo.saldo) || 0)),
        comprados,
        equipado: {
            bichos: valido('bichos', equipado.bichos) ? equipado.bichos : 'gato',
            pelagens: valido('pelagens', equipado.pelagens) ? equipado.pelagens : 'original',
            acessorios: valido('acessorios', equipado.acessorios) ? equipado.acessorios : 'nenhum'
        }
    };
}

function salvarLoja(loja) {
    lojaEmMemoria = JSON.parse(JSON.stringify(loja));
    salvarArmazenado(chaveLoja, loja);
}

function itemEquipado(loja, grupo) {
    return itensLoja[grupo].find((item) => item.id === loja.equipado[grupo]);
}

function lerRecorde() {
    const salvo = lerArmazenado(chaveRecorde, {}) || {};
    const recorde = {
        granulados: Number(salvo.granulados) || 0,
        troncos: Number(salvo.troncos) || 0,
        altura: Math.round(Number(salvo.altura) || 0)
    };
    if (!recorde.granulados && !recorde.troncos && !recorde.altura) return recorde;
    // Lacre que nao bate e recorde mexido a mao; os antigos, sem lacre, so passam se forem possiveis.
    const adulterado = salvo.selo ? salvo.selo !== selarRecorde(recorde) : recordeImpossivel(recorde);
    if (adulterado) {
        marcarTrapaceiro();
        const zerado = { granulados: 0, troncos: 0, altura: 0 };
        salvarRecorde(zerado);
        return zerado;
    }
    if (!salvo.selo) salvarRecorde(recorde);
    return recorde;
}

function salvarRecorde(recorde) {
    const limpo = { granulados: recorde.granulados, troncos: recorde.troncos, altura: Math.round(recorde.altura) };
    salvarArmazenado(chaveRecorde, { ...limpo, selo: selarRecorde(limpo) });
}

function selarRecorde(recorde) {
    let conta = 5381;
    for (const letra of `${recorde.granulados}|${recorde.troncos}|${Math.round(recorde.altura)}|casspet`) {
        conta = (conta * 33 + letra.charCodeAt(0)) >>> 0;
    }
    return conta.toString(36);
}

// Quem sobe voando passa muitos troncos sem pousar neles: a altura (ou os granulados) fica muito
// acima do que os troncos permitem. Os limites tem folga de sobra para o super pulo e a mola.
function recordeImpossivel(recorde) {
    // Versoes antigas nao guardavam os troncos; sem eles nao da para comparar.
    if (!recorde.troncos) return false;
    return recorde.altura > recorde.troncos * 360 + 3000 || recorde.granulados > recorde.troncos * 3 + 200;
}

function temNariz() {
    const perfil = lerArmazenado(chavePerfil, {}) || {};
    return perfil.palhaco === true;
}

function marcarTrapaceiro() {
    salvarArmazenado(chavePerfil, { palhaco: true });
}

// Efeitos sonoros sintetizados na hora, sem arquivos de audio.
const som = {
    ctx: null,
    saida: null,
    mudo: lerArmazenado(chaveMudo, false) === true,
    opcoes: { musica: true, efeitos: true, vibracao: true, ...lerArmazenado(chaveOpcoes, {}) },
    // O navegador so libera audio depois de um toque ou tecla.
    iniciar() {
        if (!this.ctx) {
            const Contexto = window.AudioContext || window.webkitAudioContext;
            if (!Contexto) return;
            this.ctx = new Contexto();
            this.saida = this.ctx.createGain();
            this.saida.gain.value = this.mudo ? 0 : 0.5;
            this.saida.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    alternarMudo() {
        this.mudo = !this.mudo;
        salvarArmazenado(chaveMudo, this.mudo);
        if (this.saida) {
            this.saida.gain.setTargetAtTime(this.mudo ? 0 : 0.5, this.ctx.currentTime, 0.02);
        }
    },
    tom(frequencia, duracao, { tipo = 'square', volume = 0.2, ate = 0, atraso = 0 } = {}) {
        if (!this.ctx || this.mudo || !this.opcoes.efeitos) return;
        const inicio = this.ctx.currentTime + atraso;
        const oscilador = this.ctx.createOscillator();
        const ganho = this.ctx.createGain();
        oscilador.type = tipo;
        oscilador.frequency.setValueAtTime(frequencia, inicio);
        if (ate) oscilador.frequency.exponentialRampToValueAtTime(ate, inicio + duracao);
        ganho.gain.setValueAtTime(0.0001, inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.008);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
        oscilador.connect(ganho).connect(this.saida);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracao + 0.02);
    },
    ruido(duracao, { volume = 0.2, frequencia = 1000, atraso = 0 } = {}) {
        if (!this.ctx || this.mudo || !this.opcoes.efeitos) return;
        const inicio = this.ctx.currentTime + atraso;
        const amostras = Math.ceil(this.ctx.sampleRate * duracao);
        const buffer = this.ctx.createBuffer(1, amostras, this.ctx.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < amostras; i++) dados[i] = Math.random() * 2 - 1;
        const fonte = this.ctx.createBufferSource();
        const filtro = this.ctx.createBiquadFilter();
        const ganho = this.ctx.createGain();
        fonte.buffer = buffer;
        filtro.type = 'bandpass';
        filtro.frequency.value = frequencia;
        ganho.gain.setValueAtTime(volume, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
        fonte.connect(filtro).connect(ganho).connect(this.saida);
        fonte.start(inicio);
    },
    // A vibracao tem a sua propria opcao: vale mesmo com o som desligado.
    vibrar(ms) {
        if (this.opcoes.vibracao && navigator.vibrate) navigator.vibrate(ms);
    },
    alternarOpcao(chave) {
        this.opcoes[chave] = !this.opcoes[chave];
        salvarArmazenado(chaveOpcoes, this.opcoes);
        if (chave === 'vibracao') this.vibrar(40);
    },
    clique() {
        this.tom(660, 0.06, { tipo: 'sine', volume: 0.12 });
    },
    pulo() {
        const variacao = Phaser.Math.FloatBetween(0.95, 1.05);
        this.tom(330 * variacao, 0.13, { tipo: 'sine', volume: 0.12, ate: 700 * variacao });
    },
    // Coletas seguidas sobem de tom, como uma escala.
    granulado(combo) {
        const passo = 2 ** (Math.min(combo, 12) / 12);
        this.tom(988 * passo, 0.07, { volume: 0.07 });
        this.tom(1319 * passo, 0.14, { volume: 0.07, atraso: 0.06 });
    },
    dourado() {
        [523, 659, 784, 1047, 1319].forEach((frequencia, i) =>
            this.tom(frequencia, 0.16, { tipo: 'triangle', volume: 0.16, atraso: i * 0.05 }));
        this.tom(180, 0.4, { tipo: 'sine', volume: 0.14, ate: 900 });
        this.vibrar(25);
    },
    quebra() {
        this.ruido(0.18, { volume: 0.35, frequencia: 650 });
        this.tom(170, 0.16, { tipo: 'triangle', volume: 0.2, ate: 60 });
    },
    nivel() {
        [392, 523, 659, 784].forEach((frequencia, i) =>
            this.tom(frequencia, 0.14, { volume: 0.06, atraso: i * 0.08 }));
    },
    recorde() {
        [659, 784, 1047, 1319, 1568].forEach((frequencia, i) =>
            this.tom(frequencia, 0.2, { tipo: 'triangle', volume: 0.15, atraso: i * 0.07 }));
    },
    risada() {
        [0, 0.12, 0.24].forEach((atraso) =>
            this.tom(900, 0.08, { tipo: 'square', volume: 0.04, ate: 1300, atraso }));
    },
    guaxinimPulo() {
        this.tom(420, 0.1, { tipo: 'sine', volume: 0.07, ate: 820 });
    },
    // O guaxinim leva um susto e o pacote chacoalha.
    susto() {
        this.tom(260, 0.18, { tipo: 'square', volume: 0.08, ate: 1400 });
        this.ruido(0.16, { volume: 0.18, frequencia: 3200, atraso: 0.05 });
        this.vibrar(20);
    },
    // Dois piados curtos avisam o passaro chegando.
    alertaPassaro() {
        [0, 0.12].forEach((atraso) => this.tom(2300, 0.06, { tipo: 'sine', volume: 0.06, ate: 3100, atraso }));
    },
    // Sirene de disco voador subindo e descendo.
    alertaOvni() {
        this.tom(500, 0.22, { tipo: 'sine', volume: 0.06, ate: 1100 });
        this.tom(1100, 0.22, { tipo: 'sine', volume: 0.06, ate: 500, atraso: 0.22 });
    },
    choqueOvni() {
        this.tom(1400, 0.2, { tipo: 'sawtooth', volume: 0.07, ate: 200 });
        this.ruido(0.12, { volume: 0.2, frequencia: 4000 });
        this.vibrar(40);
    },
    bicada() {
        this.ruido(0.08, { volume: 0.3, frequencia: 2600 });
        this.tom(520, 0.25, { tipo: 'triangle', volume: 0.16, ate: 180, atraso: 0.03 });
        this.vibrar(40);
    },
    // Bolha estourando e um brilho subindo.
    poder() {
        this.ruido(0.06, { volume: 0.15, frequencia: 3000 });
        [784, 988, 1175, 1568].forEach((frequencia, i) =>
            this.tom(frequencia, 0.13, { tipo: 'sine', volume: 0.13, atraso: 0.03 + i * 0.06 }));
        this.vibrar(20);
    },
    // Buzina de palhaco: fon fon.
    buzina() {
        [0, 0.2].forEach((atraso) => {
            this.tom(330, 0.16, { tipo: 'square', volume: 0.12, ate: 300, atraso });
            this.tom(165, 0.16, { tipo: 'sawtooth', volume: 0.06, atraso });
        });
        this.vibrar([60, 80, 60]);
    },
    // Cada granulado levado pelo guaxinim soa um pouco mais grave.
    roubo(indice) {
        this.tom(1300 - indice * 55, 0.07, { tipo: 'square', volume: 0.05 });
    },
    fimPoder() {
        this.tom(880, 0.16, { tipo: 'sine', volume: 0.07, ate: 440 });
    },
    escudo() {
        this.tom(1500, 0.3, { tipo: 'triangle', volume: 0.14, ate: 500 });
        this.ruido(0.12, { volume: 0.18, frequencia: 5200 });
        this.vibrar(30);
    },
    mola() {
        this.tom(170, 0.38, { tipo: 'sine', volume: 0.22, ate: 760 });
        this.tom(340, 0.24, { tipo: 'triangle', volume: 0.06, ate: 1100, atraso: 0.04 });
        this.vibrar(15);
    },
    combo(vale) {
        [659, 880, 1047, 1319].slice(0, vale + 1).forEach((frequencia, i) =>
            this.tom(frequencia, 0.14, { tipo: 'triangle', volume: 0.12, atraso: i * 0.06 }));
        this.vibrar([15, 40, 15]);
    },
    comboPerdido() {
        this.tom(440, 0.22, { tipo: 'triangle', volume: 0.08, ate: 250 });
    },
    feliz() {
        this.tom(784, 0.14, { tipo: 'sine', volume: 0.12 });
        this.tom(1047, 0.24, { tipo: 'sine', volume: 0.12, atraso: 0.11 });
    },
    suspense() {
        this.tom(196, 0.4, { tipo: 'triangle', volume: 0.14 });
        this.tom(185, 0.6, { tipo: 'triangle', volume: 0.14, atraso: 0.38 });
    },
    virarPagina() {
        this.ruido(0.14, { volume: 0.07, frequencia: 2400 });
    },
    morte() {
        this.tom(523, 0.16, { tipo: 'triangle', volume: 0.18 });
        this.tom(392, 0.16, { tipo: 'triangle', volume: 0.18, atraso: 0.15 });
        this.tom(262, 0.55, { tipo: 'triangle', volume: 0.18, atraso: 0.3, ate: 120 });
        this.vibrar(60);
    }
};

// Trilha de fundo sintetizada: 8 compassos em loop (C Am F G | F G C C),
// com melodia, baixo, acordes e bateria. Cada passo e uma colcheia.
const trilha = {
    acordes: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50],
        [41, 45, 48], [43, 47, 50], [48, 52, 55], [48, 52, 55]],
    melodia: [
        76, 0, 79, 0, 84, 0, 79, 0,
        81, 0, 79, 76, 0, 0, 72, 0,
        77, 0, 81, 0, 84, 0, 81, 79,
        79, 0, 0, 0, 74, 0, 71, 0,
        81, 0, 81, 79, 77, 0, 81, 0,
        79, 0, 83, 0, 86, 0, 83, 0,
        84, 0, 79, 0, 76, 0, 79, 0,
        84, 0, 0, 0, 79, 0, 0, 0
    ],
    // Fundamental, quinta, oitava e quinta de novo: o baixo "saltitante".
    baixo: [0, null, 7, null, 12, null, 7, null]
};

const musica = {
    tocando: false,
    passo: 0,
    proximoTempo: 0,
    bpm: 112,
    temporizador: null,
    saida: null,
    ruido: null,
    frequencia(midi) {
        return 440 * 2 ** ((midi - 69) / 12);
    },
    // Recomecar volta ao primeiro compasso; retomar depois da pausa continua de onde parou.
    tocar(recomecar = true) {
        som.iniciar();
        const ctx = som.ctx;
        if (!ctx || this.tocando) return;
        if (!this.saida) {
            this.saida = ctx.createGain();
            this.saida.gain.value = 0;
            this.saida.connect(som.saida);
            const amostras = ctx.sampleRate;
            this.ruido = ctx.createBuffer(1, amostras, ctx.sampleRate);
            const dados = this.ruido.getChannelData(0);
            for (let i = 0; i < amostras; i++) dados[i] = Math.random() * 2 - 1;
        }
        if (recomecar) this.passo = 0;
        this.tocando = true;
        this.proximoTempo = ctx.currentTime + 0.06;
        this.saida.gain.cancelScheduledValues(ctx.currentTime);
        this.saida.gain.setTargetAtTime(0.55, ctx.currentTime, 0.15);
        this.temporizador = setInterval(() => this.agendar(), 25);
    },
    parar(suavizar = 0.12) {
        if (!this.tocando) return;
        this.tocando = false;
        clearInterval(this.temporizador);
        this.saida.gain.cancelScheduledValues(som.ctx.currentTime);
        this.saida.gain.setTargetAtTime(0, som.ctx.currentTime, suavizar);
    },
    // Acompanha a aceleracao do jogo, sem passar de 1.5x o andamento inicial.
    definirVelocidade(velocidade) {
        this.bpm = 112 * Math.min(1.5, 1 + (velocidade - 1) * 0.25);
    },
    agendar() {
        const ctx = som.ctx;
        // Depois de a aba ficar em segundo plano, nao despeja as notas atrasadas de uma vez.
        if (this.proximoTempo < ctx.currentTime - 0.05) this.proximoTempo = ctx.currentTime + 0.05;
        while (this.proximoTempo < ctx.currentTime + 0.15) {
            if (!som.mudo && som.opcoes.musica) this.tocarPasso(this.passo, this.proximoTempo);
            this.proximoTempo += 30 / this.bpm;
            this.passo = (this.passo + 1) % trilha.melodia.length;
        }
    },
    nota(midi, inicio, duracao, tipo, volume, filtro = 0) {
        const ctx = som.ctx;
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();
        oscilador.type = tipo;
        oscilador.frequency.value = this.frequencia(midi);
        ganho.gain.setValueAtTime(0.0001, inicio);
        ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.012);
        ganho.gain.exponentialRampToValueAtTime(volume * 0.5, inicio + duracao * 0.5);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
        let saida = oscilador;
        if (filtro) {
            const passaBaixa = ctx.createBiquadFilter();
            passaBaixa.type = 'lowpass';
            passaBaixa.frequency.value = filtro;
            saida = saida.connect(passaBaixa);
        }
        saida.connect(ganho).connect(this.saida);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracao + 0.02);
    },
    batida(inicio, duracao, volume, tipoFiltro, frequencia) {
        const ctx = som.ctx;
        const fonte = ctx.createBufferSource();
        const filtro = ctx.createBiquadFilter();
        const ganho = ctx.createGain();
        fonte.buffer = this.ruido;
        filtro.type = tipoFiltro;
        filtro.frequency.value = frequencia;
        ganho.gain.setValueAtTime(volume, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
        fonte.connect(filtro).connect(ganho).connect(this.saida);
        fonte.start(inicio, Math.random() * 0.5, duracao + 0.02);
    },
    bumbo(inicio) {
        const ctx = som.ctx;
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();
        oscilador.frequency.setValueAtTime(150, inicio);
        oscilador.frequency.exponentialRampToValueAtTime(45, inicio + 0.12);
        ganho.gain.setValueAtTime(0.22, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.14);
        oscilador.connect(ganho).connect(this.saida);
        oscilador.start(inicio);
        oscilador.stop(inicio + 0.16);
    },
    tocarPasso(passo, inicio) {
        const colcheia = 30 / this.bpm;
        const compasso = Math.floor(passo / 8);
        const tempo = passo % 8;
        const acorde = trilha.acordes[compasso];
        // A nota dura ate a proxima nota da melodia, no maximo 4 colcheias.
        const nota = trilha.melodia[passo];
        if (nota) {
            let espera = 1;
            while (espera < 4 && !trilha.melodia[(passo + espera) % trilha.melodia.length]) espera++;
            this.nota(nota, inicio, espera * colcheia * 0.9, 'square', 0.035, 2200);
        }
        const intervalo = trilha.baixo[tempo];
        if (intervalo !== null) this.nota(acorde[0] - 12 + intervalo, inicio, colcheia * 1.6, 'triangle', 0.16);
        // Acordes curtos no contratempo, como um violao abafado.
        if (tempo === 2 || tempo === 6) {
            acorde.forEach((midi) => this.nota(midi + 12, inicio, colcheia * 0.9, 'triangle', 0.028));
        }
        if (tempo === 0 || tempo === 4) this.bumbo(inicio);
        if (tempo === 2 || tempo === 6) this.batida(inicio, 0.1, 0.07, 'bandpass', 1800);
        if (tempo % 2 === 1) this.batida(inicio, 0.03, 0.03, 'highpass', 7000);
    }
};

// O cenario em SVG demora alguns segundos para ser rasterizado; mostra o progresso.
function criarTelaCarregamento(cena) {
    // No preload a camera ainda nao tem zoom: as medidas seguem o tamanho real do canvas.
    const e = escalaRenderizacao;
    const x = cena.scale.width / 2;
    const y = cena.scale.height / 2;
    const itens = [
        cena.add.rectangle(x, y, cena.scale.width, cena.scale.height, 0x233c24),
        cena.add.text(x, y - 50 * e, 'Granulando', {
            resolution: 2, fontFamily: 'Arial', fontSize: 30 * e + 'px', fontStyle: 'bold',
            color: corTexto, stroke: '#1a0e08', strokeThickness: 6 * e
        }).setOrigin(0.5),
        cena.add.rectangle(x, y + 10 * e, 240 * e, 16 * e, 0x1a2a1a).setStrokeStyle(2 * e, 0xffe1a6),
        cena.add.text(x, y + 44 * e, 'Preparando a floresta...', {
            resolution: 2, fontFamily: 'Arial', fontSize: 14 * e + 'px', color: '#f4ddc9'
        }).setOrigin(0.5)
    ];
    const barra = cena.add.rectangle(x - 116 * e, y + 10 * e, 232 * e, 8 * e, 0xffd24a)
        .setOrigin(0, 0.5).setScale(0, 1);
    itens.push(barra);
    // Os recortes do cenario entram na fila no meio do caminho; a barra nunca volta.
    const aoProgredir = (progresso) => barra.setScale(Math.max(barra.scaleX, progresso), 1);
    cena.load.on('progress', aoProgredir);
    cena.load.once('complete', () => {
        cena.load.off('progress', aoProgredir);
        itens.forEach((item) => item.destroy());
    });
}

function preload() {
    if (!this.textures.exists('cenario_0')) criarTelaCarregamento(this);
    // Faixas do cenario ja desenhadas a partir de assets/Cenario Jogo 1.svg por
    // ferramentas/gerar-cenario.html, com as emendas do tronco suavizadas.
    // Carregar o SVG de 12 MB direto era lento demais no celular.
    // As faixas vem sem o degrade do ceu, que e desenhado no jogo (criarCeu).
    const quantidadeFaixas = Math.ceil(texturaCenario.altura / texturaCenario.alturaFaixa);
    for (let i = 0; i < quantidadeFaixas; i++) {
        this.load.image('cenario_' + i, `${texturaCenario.pasta}/cenario-${i}.webp`);
    }
    // Os SVGs dos troncos sao rasterizados no tamanho em que aparecem (e nao nos 1150 px originais).
    this.load.svg('troncoLiso', 'assets/tronco liso.svg', { width: 384, height: 86 });
    this.load.svg('troncoRachado', 'assets/tronco rachado.svg', { width: 384, height: 86 });
    // Gato parado redesenhado no mesmo estilo das outras poses (o antigo, mais escuro, e assets/mascote_1.png).
    this.load.image('mascote_1', 'assets/gato/parado.webp');
    // Tonto, com estrelinhas: aparece um instante quando o passaro ou o OVNI acerta.
    this.load.image('machucado', 'assets/gato/machucado.webp');
    this.load.image('pulando', 'assets/gato/pulando.webp');
    this.load.image('quasePulando', 'assets/gato/quasePulando.webp');
    this.load.image('caindo', 'assets/gato/caindo.webp');
    itensLoja.bichos.filter((bicho) => bicho.arte).forEach((bicho) => {
        Object.entries(posesBicho).forEach(([pose, arquivo]) =>
            this.load.image(bicho.id + '_' + pose, bicho.arte + arquivo + '.webp'));
    });
    this.load.image('moeda', 'assets/granulado.webp');
    // Galho com folhas do balanco e mola do tronco de pulo alto (feitos no Magnific, no estilo do menu).
    this.load.image('esp_galho', 'assets/especiais/galho.webp');
    this.load.image('esp_mola', 'assets/especiais/mola.webp');
    this.load.svg('moedaDourada', 'assets/granulado-dourado.svg', { width: larguraGranulado, height: larguraGranulado });
    this.load.image('introducao', 'assets/inicio.webp');
    this.load.image('historia', 'assets/historia.webp');
    // Recorte com fundo transparente de assets/guaxinim-original.webp.
    this.load.image('guaxinim', 'assets/guaxinim.png');
    // Expressoes do guaxinim, no mesmo tamanho: gargalhando e levando susto.
    this.load.image('guaxinim_rindo', 'assets/guaxinim-rindo.png');
    this.load.image('guaxinim_susto', 'assets/guaxinim-susto.png');
    // Versao reduzida e com alfa solido de assets/chao-original.webp.
    this.load.image('chao', 'assets/chao.webp');
}

function create(data = {}) {
    this.cameras.main.setOrigin(0, 0).setZoom(escalaRenderizacao);
    criarTexturasEfeitos(this);
    this.iniciado = false;
    this.iniciando = false;
    this.morreu = false;
    this.pausado = false;
    this.hud = null;
    this.totalTroncos = 0;
    this.proximoGranuladoDourado = Phaser.Math.Between(18, 30);
    this.contador = 0;
    this.totalMoedas = 0;
    this.tempoMoedas = 0;
    this.combo = { seguidos: 0, vale: 1 };
    // Contagens da partida para as missoes do dia.
    this.granuladosPegos = 0;
    this.bicadas = 0;
    // Poderes ativos (com o tempo que resta) e bolhas de poder esperando nos troncos.
    this.poderes = {};
    this.itensPoder = [];
    this.proximoPoder = Phaser.Math.Between(troncoPoderes, troncoPoderes + 4);
    this.ultimoPoder = null;
    this.proximaMola = troncoMola + Phaser.Math.Between(0, 6);
    this.dicasVistas = lerArmazenado(chaveDicas, []);
    // Vigia da partida: confere placar, gravidade e subida; trapaca vira a peca do guaxinim.
    this.vigia = { amostras: [], moedas: 0, troncos: 0 };
    this.trapaca = null;
    this.pegandoTrapaceiro = false;
    this.filaDicas = [];
    this.dicaAberta = null;
    this.esperaDicas = 0;
    this.maoTutorial = null;
    this.proximoBalanco = troncoBalanco + Phaser.Math.Between(0, 6);
    this.alturaMax = 0;
    this.recorde = lerRecorde();
    this.nariz = temNariz();
    this.passouRecorde = false;
    this.vendoHistoria = false;
    // Numero do tronco mais alto em que o gato ja pousou; o guaxinim foge a partir dele.
    this.ultimoTronco = 0;
    this.moedas = this.physics.add.staticGroup();
    this.velocidadeJogo = 1;
    this.sombraGato = null;
    // O primeiro passaro chega logo depois de o gato alcancar a altura deles.
    // Os troncos sao criados antes do guaxinim; nao aproveita o da partida anterior.
    this.guaxinim = null;
    this.espaco = null;
    // O ceu e criado antes das folhas; sem isso ele religaria as folhas da partida anterior,
    // ja destruidas (o jogo travava no MENU ou no JOGAR DE NOVO depois de perder no espaco).
    this.folhasJogo = null;
    this.faixa = null;
    this.passaros = [];
    this.esperaPassaro = 2500;
    this.vidaFundo = { esperaBorboleta: 2500, esperaBando: 6000, esperaVagalume: 0 };
    this.physics.world.gravity.y = gravidadeBase;
    const cenarioFundo = this.add.container(config.width / 2, config.height)
        .setScrollFactor(0).setDepth(-2);
    const quantidadeFaixas = Math.ceil(texturaCenario.altura / texturaCenario.alturaFaixa);
    for (let i = 0; i < quantidadeFaixas; i++) {
        const inicio = i * texturaCenario.alturaFaixa;
        const altura = Math.min(texturaCenario.alturaFaixa, texturaCenario.altura - inicio);
        const textura = this.textures.get('cenario_' + i);
        if (!textura.has('miolo')) {
            textura.add('miolo', 0, 0, texturaCenario.margem, texturaCenario.largura, altura);
        }
        // As faixas se encostam; a margem fica fora da area visivel do frame.
        const y = inicio - texturaCenario.altura;
        cenarioFundo.add(this.add.image(0, y, 'cenario_' + i, 'miolo')
            .setOrigin(texturaCenario.centroTronco / texturaCenario.largura, 0));
    }
    this.cenario = {
        base: cenarioFundo, deslocamento: 0, alvo: 0,
        larguraTronco: enquadramentoCenario.abertura,
        alturaInicialGato: alturaChao - 40, paralaxe: 0.12
    };
    criarCeu(this);
    this.folhasJogo = criarFolhas(this, -1, 1500);
    // Metade da altura do gato e 40: ele comeca com os pes na grama.
    // A caixa e so o corpo fisico; o gato visivel acompanha ela com
    // deformacao e inclinacao, sem mexer na area de colisao.
    this.loja = lerLoja();
    this.caixa = this.add.image(config.width / 2, alturaChao - 40, texturaPose(this, 'mascote_1'))
        .setDisplaySize(78, 80).setVisible(false);
    this.gato = this.add.image(this.caixa.x, this.caixa.y + 40, texturaPose(this, 'mascote_1'))
        .setOrigin(0.5, 1).setDepth(5);
    this.deformacao = { x: 1, y: 1 };
    vestirGato(this, this.gato);
    atualizarCenario(this, 0);
    this.physics.add.existing(this.caixa);
    // Corpo em pixels da textura de 512 (o mesmo que 1200 x 1400 na grade de 2048).
    this.caixa.body.setSize(tamanhoPose * 1200 / 2048, tamanhoPose * 1400 / 2048);
    // Roda depois da fisica, para o gato nunca ficar um quadro atrasado.
    const sincronizar = (tempo, delta) => sincronizarGato(this, delta);
    this.events.on('postupdate', sincronizar);
    sincronizarGato(this, 0);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.teclasLaterais = this.input.keyboard.addKeys('A,D');
    configurarComandoSecreto(this);
    configurarAtalhos(this);

    this.plataformas = this.physics.add.staticGroup();
    // O corpo invisivel do chao tem 16 px: o centro fica 8 px abaixo da grama.
    criarPlataforma(this, 180, alturaChao + 8, 360, true);
    this.add.image(180, alturaChao, 'chao').setOrigin(0.5, superficieChao)
        .setDisplaySize(config.width, config.width * 229 / 900).setDepth(0.5);
    // Sombra macia que aparece quando o gato esta perto do chao.
    this.sombraGato = this.add.ellipse(0, alturaChao, 46, 10, 0x2a160d).setDepth(0.6).setAlpha(0);
    criarBorboletas(this);
    this.ultimaPlataformaX = config.width / 2;
    this.ultimaPlataformaY = alturaChao + 8;
    this.cameras.main.setScroll(0, 0);
    gerarPlataformas(this);
    desenharLinhaRecorde(this);

    this.physics.add.collider(this.caixa, this.plataformas, pular, function (caixa) {
        // Deixa o gato atravessar as plataformas quando estiver subindo.
        return !caixa.quedaSemVolta && caixa.body.velocity.y > 0;
    });
    this.physics.add.overlap(this.caixa, this.moedas, coletarMoeda);

    this.efeitos = {
        poeira: this.add.particles(0, 0, 'fx_ponto', {
            emitting: false, lifespan: 380,
            speed: { min: 25, max: 75 }, angle: { min: 190, max: 350 },
            scale: { start: 0.5, end: 0 }, alpha: { start: 0.75, end: 0 },
            tint: [0xf1dcbc, 0xd9b38a, 0xc49468]
        }).setDepth(4),
        lascas: this.add.particles(0, 0, 'fx_lasca', {
            emitting: false, lifespan: 750,
            speed: { min: 70, max: 190 }, angle: { min: 200, max: 340 },
            gravityY: 700, rotate: { start: 0, end: 540 },
            scale: { start: 0.8, end: 0.45 }, alpha: { start: 1, end: 0 },
            tint: [0x8a5a35, 0x5b3520, 0xc58b55, 0x3f2219]
        }).setDepth(3),
        brilho: this.add.particles(0, 0, 'fx_estrela', {
            emitting: false, lifespan: 480,
            speed: { min: 50, max: 150 }, rotate: { start: 0, end: 180 },
            scale: { start: 0.7, end: 0 }, blendMode: 'ADD',
            tint: [0xfff4b0, 0xffe165, 0xffffff]
        }).setDepth(6),
        // Pedacinhos de grama quando o gato pula do chao.
        grama: this.add.particles(0, 0, 'fx_folha', {
            emitting: false, lifespan: 550,
            speed: { min: 50, max: 120 }, angle: { min: 205, max: 335 },
            gravityY: 500, rotate: { start: 0, end: 360 },
            scale: { start: 0.45, end: 0.25 }, alpha: { start: 1, end: 0 },
            tint: [0x7cc242, 0x9fd653, 0x5ea832, 0xb8e05a]
        }).setDepth(4),
        // Granulados escapando do saco roubado.
        granulos: this.add.particles(0, 0, 'moeda', {
            emitting: false, lifespan: 1100,
            speedX: { min: -50, max: 50 }, speedY: { min: -60, max: 10 },
            gravityY: 650, rotate: { start: 0, end: 360 },
            scale: { start: 18 / larguraGranulado, end: 14.5 / larguraGranulado }, alpha: { start: 1, end: 0 }
        }).setDepth(1.6),
        // Penas soltas quando o passaro inimigo bica o gato.
        penas: this.add.particles(0, 0, 'fx_folha', {
            emitting: false, lifespan: 900,
            speed: { min: 40, max: 110 }, gravityY: 120, rotate: { start: 0, end: 540 },
            scale: { start: 0.55, end: 0.3 }, alpha: { start: 1, end: 0 },
            tint: [0x4a63b8, 0x34489a, 0xdfe6f7]
        }).setDepth(5.6)
    };
    criarGuaxinim(this);

    // Retoma a partida com um toque em qualquer lugar quando estiver pausada.
    this.input.on('pointerdown', () => {
        som.iniciar();
        if (this.pausado && this.time.now - this.pausadoEm > 150) alternarPausa(this, false);
    });
    // Pausa sozinho quando o jogador troca de aba ou de aplicativo.
    const aoOcultar = () => alternarPausa(this, true);
    this.game.events.on('hidden', aoOcultar);
    this.events.once('shutdown', () => {
        this.events.off('postupdate', sincronizar);
        this.game.events.off('hidden', aoOcultar);
    });

    // Arte vertical cobrindo a tela; em telas altas corta um pouco das arvores nas laterais.
    // As areas de toque seguem as placas, em pixels da arte (941 x 1672).
    const escalaInicio = Math.max(config.width / 941, config.height / 1672);
    const yArte = (y) => config.height / 2 + (y - 1672 / 2) * escalaInicio;
    const fundoInicio = this.add.rectangle(180, config.height / 2, 360, config.height, 0x233c24);
    const arteInicio = this.add.image(180, config.height / 2, 'introducao', '__BASE').setScale(escalaInicio);
    const dicaInicio = this.add.text(180, yArte(1531),
        'Arraste o dedo na parte de baixo da tela', {
        resolution: 4, fontFamily: 'Arial', fontSize: '14px', color: corTexto,
        align: 'center', lineSpacing: 5, backgroundColor: '#233c24',
        padding: { x: 8, y: 6 }
    }).setOrigin(0.5);
    const itensInicio = [fundoInicio, arteInicio, dicaInicio];
    if (this.nariz) {
        // Quem trapaceou ve o apelido no lugar do recorde e como tirar o nariz.
        itensInicio.push(this.add.text(180, yArte(1390), 'Recorde: 0 · Trapaceiro', {
            resolution: 4, fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold',
            color: '#ffffff', backgroundColor: '#d9452f', padding: { x: 10, y: 5 }
        }).setOrigin(0.5), this.add.text(180, yArte(1390) + 24,
            `Suba ${troncosPerdao} troncos jogando limpo para tirar o nariz`, {
                resolution: 4, fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
                color: '#fff4d6', stroke: '#2a1410', strokeThickness: 3
            }).setOrigin(0.5));
    } else if (this.recorde.granulados > 0 || this.recorde.troncos > 0) {
        itensInicio.push(this.add.text(180, yArte(1390),
            `Recorde: ${contar(this.recorde.granulados, 'granulado')} · ${contar(this.recorde.troncos, 'tronco')}`, {
                resolution: 4, fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold',
                color: '#382017', backgroundColor: '#ffd24a', padding: { x: 10, y: 5 }
            }).setOrigin(0.5));
    }
    const zonaMenu = (y) => this.add.zone(180, yArte(y),
        470 * escalaInicio, 106 * escalaInicio).setInteractive({ useHandCursor: true });
    const botaoInicio = zonaMenu(760);
    const botaoConfiguracoes = zonaMenu(877);
    const botaoLoja = zonaMenu(990);
    const botoesMenu = [botaoInicio, botaoConfiguracoes, botaoLoja];
    // A placa SAIR da arte vira LOJA: um pedaco liso da propria madeira cobre o icone e o texto.
    const xArte = (x) => config.width / 2 + (x - 941 / 2) * escalaInicio;
    const texturaInicio = this.textures.get('introducao');
    if (!texturaInicio.has('madeiraLoja')) texturaInicio.add('madeiraLoja', 0, 582, 962, 86, 56);
    const remendo = this.add.image(xArte(318), yArte(962), 'introducao', 'madeiraLoja')
        .setOrigin(0, 0).setDisplaySize(262 * escalaInicio, 56 * escalaInicio);
    const iconeLoja = this.add.image(xArte(360), yArte(990), 'ic_sacola').setScale(escalaInicio * 0.95);
    const textoLoja = this.add.text(xArte(505), yArte(992), 'LOJA', {
        resolution: 4, fontFamily: 'Arial Black, Arial, sans-serif', fontSize: Math.round(54 * escalaInicio) + 'px',
        fontStyle: 'bold', color: '#4d2710', stroke: '#f6c98f', strokeThickness: Math.max(1, Math.round(3 * escalaInicio))
    }).setOrigin(0.5);
    itensInicio.push(remendo, iconeLoja, textoLoja);
    // O gato da pintura do menu tambem ganha o nariz de palhaco do trapaceiro, que balanca de vez em quando.
    if (this.nariz) {
        const escalaNariz = 28 * escalaInicio / 81;
        const narizMenu = this.add.image(xArte(303), yArte(1150), 'ac_palhaco').setScale(escalaNariz);
        this.tweens.add({
            targets: narizMenu, scale: escalaNariz * 1.35, duration: 140, yoyo: true, repeat: 1,
            loop: -1, loopDelay: 2200
        });
        itensInicio.push(narizMenu);
    }
    // Missoes do dia: botao redondo no alto do menu, com quantas ja foram feitas hoje.
    const feitasHoje = lerProgressoMissoes().feitas.length;
    const iconeMissoes = this.add.graphics();
    desenharIconeMissoes(iconeMissoes);
    const botaoMissoes = this.add.container(322, 44, [
        this.add.graphics().fillStyle(0x1a0e08, 0.35).fillCircle(0, 3, 24),
        this.add.image(0, 0, texturaMadeira(this, 52, 52, { raio: 24 })).setScale(1 / escalaMadeira),
        iconeMissoes,
        this.add.circle(17, 17, 12, feitasHoje === 3 ? 0x3f8a4c : 0xd9452f).setStrokeStyle(2, 0xfff4d6),
        this.add.text(17, 17, `${feitasHoje}/3`, {
            resolution: 4, fontFamily: 'Arial', fontSize: '10px', fontStyle: 'bold', color: '#fff4d6'
        }).setOrigin(0.5),
        this.add.text(0, 36, 'Missões', {
            resolution: 4, fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#fff4d6',
            stroke: '#2a1410', strokeThickness: 4
        }).setOrigin(0.5)
    ]).setSize(56, 56).setInteractive({ useHandCursor: true });
    // Balanca de vez em quando enquanto faltam missoes, para chamar a atencao.
    if (feitasHoje < 3) {
        this.tweens.add({
            targets: botaoMissoes, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 3,
            repeatDelay: 0, loop: -1, loopDelay: 2600
        });
    }
    botaoMissoes.on('pointerdown', () => {
        if (this.avisoInicio) return;
        som.iniciar();
        som.clique();
        botoesMenu.forEach((botao) => botao.disableInteractive());
        this.avisoInicio = mostrarMissoes(this, () => {
            this.avisoInicio = null;
            botoesMenu.forEach((botao) => botao.setInteractive({ useHandCursor: true }));
        });
    });
    itensInicio.push(botaoMissoes);
    // Instalar como app: no Android usa o convite do navegador; no iPhone explica o caminho.
    // Some quando o jogo ja esta aberto como app.
    const comoApp = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    const noIphone = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!comoApp && (window.pedidoInstalar || noIphone)) {
        const iconeInstalar = this.add.graphics();
        desenharIconeInstalar(iconeInstalar);
        const botaoInstalar = this.add.container(38, 44, [
            this.add.graphics().fillStyle(0x1a0e08, 0.35).fillCircle(0, 3, 24),
            this.add.image(0, 0, texturaMadeira(this, 52, 52, { raio: 24 })).setScale(1 / escalaMadeira),
            iconeInstalar,
            this.add.text(0, 36, 'Instalar', {
                resolution: 4, fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#fff4d6',
                stroke: '#2a1410', strokeThickness: 4
            }).setOrigin(0.5)
        ]).setSize(56, 56).setInteractive({ useHandCursor: true });
        botaoInstalar.on('pointerdown', () => {
            if (this.avisoInicio) return;
            som.iniciar();
            const pedido = window.pedidoInstalar;
            if (pedido) {
                som.clique();
                window.pedidoInstalar = null;
                pedido.prompt();
                pedido.userChoice.then((escolha) => {
                    if (escolha.outcome === 'accepted' && botaoInstalar.active) botaoInstalar.setVisible(false);
                }).catch(() => {});
                return;
            }
            mostrarAvisoInicio('INSTALAR O JOGO\n\nNo iPhone, abra este link no Safari, toque em Compartilhar ' +
                '(o quadrado com a seta para cima) e depois em "Adicionar à Tela de Início".\n\n' +
                'O Granulando vira um app e abre em tela cheia, até sem internet.');
        });
        itensInicio.push(botaoInstalar);
    }
    // Folhas caindo por cima da arte deixam o menu vivo.
    const folhasInicio = criarFolhas(this, 0, 700);
    const borboletasMenu = criarBorboletasMenu(this, yArte);
    this.telaInicio = this.add.container(0, 0, [...itensInicio, folhasInicio, ...borboletasMenu, ...botoesMenu])
        .setScrollFactor(0).setDepth(20);
    // Brilhos, estrelinhas e o aperto das placas ficam fora do container, porque usam mascara.
    const extrasMenu = animarMenu(this, xArte, yArte, escalaInicio, botoesMenu);
    this.telaInicio.on('destroy', () => extrasMenu.forEach((objeto) => objeto.destroy()));
    this.telaInicio.extras = extrasMenu;
    this.tweens.add({
        targets: dicaInicio, alpha: 0.55, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    const mostrarAvisoInicio = (texto, comHistoria = false) => {
        if (this.avisoInicio) return;
        som.clique();
        const centro = config.height / 2;
        // As configuracoes tambem mostram as opcoes de som, entao a caixa cresce.
        const alto = comHistoria ? 150 : 0;
        const fundo = this.add.rectangle(180, centro, 336, 330 + alto, corMadeiraEscura)
            .setStrokeStyle(2, 0xffe1a6);
        const mensagem = this.add.text(180, centro - 48 - alto / 2 - (comHistoria ? 10 : 0), texto, {
            resolution: 4, fontFamily: 'Arial', fontSize: '15px', color: corTexto,
            align: 'center', wordWrap: { width: 300 }, lineSpacing: 6
        }).setOrigin(0.5);
        const estiloBotao = {
            resolution: 4, fontFamily: 'Arial', fontSize: '17px', fontStyle: 'bold',
            color: '#ffffff', backgroundColor: '#634128', padding: { x: 20, y: 12 }
        };
        const fechar = this.add.text(comHistoria ? 250 : 180, centro + 108 + alto / 2, 'VOLTAR', estiloBotao)
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        const itens = [fundo, mensagem, fechar];
        if (comHistoria) itens.push(...criarOpcoesSom(this, centro + 10));
        const fecharAviso = () => {
            som.clique();
            this.avisoInicio.destroy();
            this.avisoInicio = null;
            botoesMenu.forEach((botao) => botao.setInteractive({ useHandCursor: true }));
        };
        if (comHistoria) {
            const historia = this.add.text(112, centro + 108 + alto / 2, 'HISTÓRIA',
                { ...estiloBotao, backgroundColor: '#8a5a2b' })
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            historia.on('pointerup', () => {
                fecharAviso();
                mostrarHistoria(this, () => {}, 'Toque para voltar ao menu');
            });
            itens.push(historia);
        }
        botoesMenu.forEach((botao) => botao.disableInteractive());
        this.avisoInicio = this.add.container(0, 0, itens).setAlpha(0);
        this.telaInicio.add(this.avisoInicio);
        this.tweens.add({ targets: this.avisoInicio, alpha: 1, duration: 160 });
        fechar.on('pointerup', fecharAviso);
    };
    this.avisoInicio = null;
    botaoConfiguracoes.on('pointerup', () => mostrarAvisoInicio(
        'CONTROLES\n\nArraste o dedo na metade de baixo da tela: o gato anda até ficar alinhado com ele.\n\n' +
        'Os saltos são automáticos.\n\n' +
        'Os botões no alto da tela pausam o jogo e ligam ou desligam o som.', true));
    botaoLoja.on('pointerup', () => {
        if (this.avisoInicio) return;
        som.clique();
        botoesMenu.forEach((botao) => botao.disableInteractive());
        [this.telaInicio, ...this.telaInicio.extras].forEach((objeto) => objeto.setVisible(false));
        this.avisoInicio = mostrarLoja(this, () => {
            this.avisoInicio = null;
            [this.telaInicio, ...this.telaInicio.extras].forEach((objeto) => objeto.setVisible(true));
            botoesMenu.forEach((botao) => botao.setInteractive({ useHandCursor: true }));
        });
    });
    this.physics.pause();

    const iniciarPartida = () => {
        registrarMissao(this, 'partidas', 1);
        criarHud(this);
        musica.definirVelocidade(1);
        musica.tocar();
        // Primeiro apresenta a aproximacao; depois libera o primeiro salto.
        enquadrarCenario(this, enquadramentoCenario.jogo, enquadramentoCenario.duracao, () => {
            this.iniciando = false;
            this.iniciado = true;
            this.physics.resume();
            provocarGuaxinim(this);
            if (!this.dicasVistas.includes('mover')) mostrarMaoTutorial(this);
        });
    };
    const comecar = () => {
        if (this.iniciado || this.iniciando || this.avisoInicio || this.vendoHistoria) return;
        som.iniciar();
        this.iniciando = true;
        botoesMenu.forEach((botao) => botao.disableInteractive());
        this.input.keyboard.off('keydown-SPACE', comecar);
        this.input.keyboard.off('keydown-ENTER', comecar);
        const telaInicio = this.telaInicio;
        if (data.reiniciar) {
            telaInicio.destroy();
        } else {
            som.clique();
            this.tweens.add({
                targets: [telaInicio, ...telaInicio.extras], alpha: 0, duration: 280, ease: 'Quad.easeOut',
                onComplete: () => telaInicio.destroy()
            });
        }
        // Pelo INICIAR do menu a partida comeca pelos quadrinhos que contam por que o gato
        // esta subindo (PULAR vai direto para o jogo). JOGAR DE NOVO nao repete a historia.
        if (data.reiniciar) iniciarPartida();
        else mostrarHistoria(this, iniciarPartida, 'Toque para começar!');
    };
    // Somente a placa INICIAR comeca a partida por toque.
    botaoInicio.on('pointerup', comecar);
    this.input.keyboard.on('keydown-SPACE', comecar);
    this.input.keyboard.on('keydown-ENTER', comecar);
    if (data.reiniciar) comecar();
}

// Texturas pequenas das particulas, desenhadas em 2x para ficarem nitidas com o zoom.
function criarTexturasEfeitos(cena) {
    if (cena.textures.exists('fx_ponto')) return;
    const g = cena.make.graphics({ add: false });
    g.fillStyle(0xffffff).fillCircle(8, 8, 8);
    g.generateTexture('fx_ponto', 16, 16);
    g.clear().fillStyle(0xffffff).fillRoundedRect(0, 0, 14, 6, 2);
    g.generateTexture('fx_lasca', 14, 6);
    const pontas = [];
    for (let i = 0; i < 8; i++) {
        const raio = i % 2 === 0 ? 8 : 2.5;
        const angulo = i * Math.PI / 4 - Math.PI / 2;
        pontas.push({ x: 8 + Math.cos(angulo) * raio, y: 8 + Math.sin(angulo) * raio });
    }
    g.clear().fillStyle(0xffffff).fillPoints(pontas, true);
    g.generateTexture('fx_estrela', 16, 16);
    g.clear().fillStyle(0xffffff).fillEllipse(9, 5, 18, 9);
    g.lineStyle(1, 0x000000, 0.25).lineBetween(2, 5, 16, 5);
    g.generateTexture('fx_folha', 18, 10);
    // Saquinho de granulado roubado, no estilo da embalagem dos quadrinhos.
    g.clear().fillStyle(0x2a1512).fillRoundedRect(0, 3, 40, 49, 6);
    g.fillStyle(0xe8cc9c).fillRoundedRect(3, 6, 34, 43, 4);
    g.fillStyle(0x1e1e1e).fillRect(3, 6, 34, 11);
    g.fillStyle(0x2a1512);
    for (let x = 1; x < 38; x += 6) g.fillTriangle(x, 4, x + 3, 0, x + 6, 4);
    g.fillStyle(0xc9a06a).fillRoundedRect(9, 22, 22, 13, 3);
    g.fillStyle(0xf3dcb0);
    [[13, 26], [19, 25], [25, 27], [15, 31], [22, 31], [28, 31]].forEach(([x, y]) => g.fillCircle(x, y, 2));
    g.fillStyle(0x2f6b3a);
    for (let x = 3; x < 36; x += 7) g.fillTriangle(x, 49, x + 3.5, 40, x + 7, 49);
    g.generateTexture('fx_saco', 40, 52);
    // Borboleta branca com contorno escuro; a cor vem do tint.
    g.clear().fillStyle(0x3b1a0e);
    g.fillEllipse(8, 8, 16, 14).fillEllipse(24, 8, 16, 14).fillEllipse(9, 18, 12, 10).fillEllipse(23, 18, 12, 10);
    g.fillStyle(0xffffff);
    g.fillEllipse(8, 8, 12, 10).fillEllipse(24, 8, 12, 10).fillEllipse(9, 18, 8, 6).fillEllipse(23, 18, 8, 6);
    g.fillStyle(0x3b1a0e).fillRoundedRect(14.5, 3, 3, 20, 1.5);
    g.generateTexture('fx_borboleta', 32, 24);
    // Faixa de brilho que atravessa placas e letreiro no menu.
    g.clear();
    for (let i = 0; i < 48; i++) g.fillStyle(0xffffff, Math.sin(Math.PI * i / 47) ** 2 * 0.55).fillRect(i, 0, 1, 240);
    g.generateTexture('fx_faixa', 48, 240);
    // Passaro inimigo olhando para a direita, em dois quadros de batida de asa.
    [['fx_passaro_a', [[24, 31], [46, 29], [42, 16], [32, 4], [20, 8]]],
        ['fx_passaro_b', [[24, 31], [46, 33], [42, 45], [32, 57], [20, 52]]]].forEach(([chave, asa]) => {
        const contorno = 0x241629;
        g.clear().lineStyle(3, contorno);
        g.fillStyle(0x4a63b8).fillTriangle(3, 22, 22, 28, 5, 42).strokeTriangle(3, 22, 22, 28, 5, 42);
        g.fillStyle(0x4a63b8).fillEllipse(36, 34, 40, 27).strokeEllipse(36, 34, 40, 27);
        g.fillStyle(0xdfe6f7).fillEllipse(42, 39, 22, 12);
        g.fillStyle(0x4a63b8).fillTriangle(48, 16, 51, 3, 57, 14).strokeTriangle(48, 16, 51, 3, 57, 14);
        g.fillStyle(0x4a63b8).fillCircle(56, 25, 13).strokeCircle(56, 25, 13);
        g.fillStyle(0xf5a623).fillTriangle(67, 21, 79, 27, 67, 32).strokeTriangle(67, 21, 79, 27, 67, 32);
        g.fillStyle(0xffffff).fillCircle(60, 23, 5.5).lineStyle(1.5, contorno).strokeCircle(60, 23, 5.5);
        g.fillStyle(contorno).fillCircle(61.5, 24, 2.8);
        // Sobrancelha brava.
        g.lineStyle(3.5, contorno).lineBetween(53, 15, 66, 20);
        const pontos = asa.map(([x, y]) => ({ x, y }));
        g.fillStyle(0x34489a).fillPoints(pontos, true);
        g.lineStyle(3, contorno).strokePoints(pontos, true);
        g.generateTexture(chave, 80, 60);
    });
    // OVNI com um alienigena na cupula; as luzes trocam de cor entre os dois quadros.
    [['fx_ovni_a', [0xffe066, 0xff6fa8]], ['fx_ovni_b', [0xff6fa8, 0xffe066]]].forEach(([chave, cores]) => {
        const contorno = 0x241629;
        g.clear().fillStyle(0xbfeeff, 0.95).fillEllipse(50, 24, 38, 32);
        g.fillStyle(0x7ed957).fillCircle(50, 25, 9);
        g.fillStyle(contorno).fillEllipse(46.5, 24, 4.5, 6.5).fillEllipse(53.5, 24, 4.5, 6.5);
        g.lineStyle(2.5, contorno).strokeEllipse(50, 24, 38, 32);
        g.fillStyle(0x9aa3b5).fillEllipse(50, 38, 94, 24).lineStyle(3, contorno).strokeEllipse(50, 38, 94, 24);
        g.fillStyle(0x6c7488).fillEllipse(50, 45, 58, 10);
        [16, 33, 50, 67, 84].forEach((x, k) => g.fillStyle(cores[k % 2]).fillCircle(x, 38, 4));
        g.generateTexture(chave, 100, 60);
    });
    criarTexturasAcessorios(g);
    criarTexturasPoderes(g);
    // Silhueta de passarinho distante para os bandos do fundo; a cor vem do tint.
    [['fx_ave_fundo_a', [[3, 4], [10, 9], [20, 13], [30, 9], [37, 4]]],
        ['fx_ave_fundo_b', [[3, 15], [10, 11], [20, 12], [30, 11], [37, 15]]]].forEach(([chave, asas]) => {
        g.clear().lineStyle(3.5, 0xffffff).strokePoints(asas.map(([x, y]) => ({ x, y })), false);
        g.fillStyle(0xffffff).fillEllipse(20, 13, 7, 5);
        g.generateTexture(chave, 40, 20);
    });
    g.destroy();
}

// Poderes, bolha, escudo em volta do gato e mola, desenhados em 3x (usados com escala 1/3).
function criarTexturasPoderes(g) {
    const contorno = 0x2a1512;
    const desenhar = (chave, largura, altura, pintar) => {
        g.clear().save().scaleCanvas(3, 3);
        pintar();
        g.restore();
        g.generateTexture(chave, largura * 3, altura * 3);
    };
    // Ima de ferradura vermelho com pontas prateadas.
    desenhar('pw_ima', 30, 30, () => {
        const ferradura = (espessura, cor) => {
            g.lineStyle(espessura, cor, 1).beginPath();
            g.moveTo(7.5, 5);
            g.lineTo(7.5, 15);
            g.arc(15, 15, 7.5, Math.PI, 0, true);
            g.lineTo(22.5, 5);
            g.strokePath();
        };
        ferradura(10, contorno);
        ferradura(6.5, 0xe8453c);
        g.lineStyle(1.5, 0xff9a8a, 1).beginPath().arc(15, 15, 7.5, Math.PI * 0.85, Math.PI * 0.55, true).strokePath();
        [4, 19].forEach((x) => g.fillStyle(0xe6ecf2, 1).fillRect(x, 2, 7, 5).lineStyle(2, contorno, 1).strokeRect(x, 2, 7, 5));
    });
    // Escudo azul com um brilho.
    desenhar('pw_escudo', 30, 30, () => {
        const pontos = [[15, 3], [26, 7], [25, 16], [15, 27], [5, 16], [4, 7]].map(([x, y]) => ({ x, y }));
        g.fillStyle(0x3d8fd9, 1).fillPoints(pontos, true).lineStyle(2.5, contorno, 1).strokePoints(pontos, true);
        const dentro = [[15, 7], [22, 9.5], [21.5, 15.5], [15, 22.5], [8.5, 15.5], [8, 9.5]].map(([x, y]) => ({ x, y }));
        g.fillStyle(0x7cc8ff, 1).fillPoints(dentro, true);
        g.fillStyle(0xffffff, 0.8).fillEllipse(11.5, 11, 3.5, 6);
    });
    // Pacote de granulado com um furo e granulados escapando.
    desenhar('pw_pacote', 30, 30, () => {
        g.fillStyle(contorno, 1).fillRoundedRect(5, 3, 17, 23, 3);
        g.fillStyle(0xe8cc9c, 1).fillRoundedRect(6.5, 4.5, 14, 20, 2);
        g.fillStyle(0x1e1e1e, 1).fillRect(6.5, 4.5, 14, 5);
        g.fillStyle(0x2f6b3a, 1).fillRect(6.5, 20.5, 14, 4);
        g.fillStyle(0xc9a06a, 1).fillRoundedRect(9, 12, 9, 6, 1.5);
        g.fillStyle(contorno, 1).fillEllipse(19.5, 18, 5, 4);
        [[23, 20, 2], [25.5, 24, 1.8], [22.5, 27, 1.6]].forEach(([x, y, r]) =>
            g.fillStyle(contorno, 1).fillCircle(x, y, r + 0.8).fillStyle(0xd9a55f, 1).fillCircle(x, y, r));
    });
    // Nariz de palhaco: bolinha vermelha com brilho.
    desenhar('ac_palhaco', 30, 30, () => {
        g.fillStyle(contorno, 1).fillCircle(15, 15, 13.5);
        g.fillStyle(0xe8232f, 1).fillCircle(15, 15, 11.5);
        g.fillStyle(0xff6b6b, 1).fillCircle(12.5, 12.5, 6);
        g.fillStyle(0xffffff, 0.9).fillCircle(10.5, 10.5, 2.6);
    });
    // Bolha transparente com reflexo.
    desenhar('pw_bolha', 48, 48, () => {
        g.fillStyle(0xffffff, 0.14).fillCircle(24, 24, 21);
        g.lineStyle(2, 0xffffff, 0.85).strokeCircle(24, 24, 21);
        g.lineStyle(3, 0xffffff, 0.8).beginPath().arc(24, 24, 16, Math.PI * 1.1, Math.PI * 1.4, false).strokePath();
        g.fillStyle(0xffffff, 0.9).fillCircle(33, 14, 2);
    });
    // Raios de luz atras da bolha; a cor vem do tint.
    desenhar('pw_brilho', 60, 60, () => {
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            g.fillStyle(0xffffff, 0.55).fillTriangle(30, 30,
                30 + Math.cos(a - 0.14) * 30, 30 + Math.sin(a - 0.14) * 30,
                30 + Math.cos(a + 0.14) * 30, 30 + Math.sin(a + 0.14) * 30);
        }
        g.fillStyle(0xffffff, 0.5).fillCircle(30, 30, 17);
    });
    // Campo do escudo em volta do gato.
    desenhar('pw_campo', 96, 96, () => {
        g.fillStyle(0x7cc8ff, 0.14).fillCircle(48, 48, 45);
        g.lineStyle(2.5, 0xbfe6ff, 0.9).strokeCircle(48, 48, 45);
        g.lineStyle(4, 0xffffff, 0.7).beginPath().arc(48, 48, 38, Math.PI * 1.1, Math.PI * 1.45, false).strokePath();
        g.lineStyle(2, 0xffffff, 0.5).beginPath().arc(48, 48, 38, Math.PI * 0.15, Math.PI * 0.3, false).strokePath();
    });
}

// Acessorios da loja e o icone da placa LOJA, no mesmo traco escuro do gato.
function criarTexturasAcessorios(g) {
    const contorno = 0x2a1410;
    // Bone vermelho com aba para a frente (direita) e patinha na frente.
    g.clear().lineStyle(5, contorno);
    g.fillStyle(0xb3321f).fillEllipse(96, 58, 60, 16).strokeEllipse(96, 58, 60, 16);
    g.fillStyle(0xd9452f).fillEllipse(56, 50, 92, 72);
    g.fillStyle(0xd9452f).fillRect(10, 50, 92, 12);
    g.lineStyle(5, contorno).strokeEllipse(56, 50, 92, 72);
    g.lineBetween(10, 60, 102, 60);
    g.fillStyle(0xd9452f).fillRect(12, 50, 88, 8);
    g.fillStyle(0xffe1a6).fillCircle(56, 15, 5);
    desenharPatinha(g, 60, 38, 0.42, 0xffe1a6);
    g.generateTexture('ac_bone', 130, 70);
    // Oculos escuros com brilho.
    g.clear().lineStyle(5, contorno).lineBetween(46, 22, 64, 22);
    [[26, 24], [84, 24]].forEach(([x, y]) => {
        g.fillStyle(0x241629).fillRoundedRect(x - 22, y - 15, 44, 30, 12);
        g.lineStyle(4, contorno).strokeRoundedRect(x - 22, y - 15, 44, 30, 12);
        g.fillStyle(0xffffff, 0.55).fillEllipse(x - 8, y - 6, 12, 6);
    });
    g.generateTexture('ac_oculos', 110, 48);
    // Bandana verde da embalagem Casspet, com a patinha.
    g.clear().fillStyle(0x2f6b3a).fillTriangle(6, 8, 104, 8, 55, 74);
    g.lineStyle(5, contorno).strokeTriangle(6, 8, 104, 8, 55, 74);
    g.fillStyle(0x3f8a4c).fillRect(8, 8, 94, 10);
    desenharPatinha(g, 55, 34, 0.5, 0xffe1a6);
    g.generateTexture('ac_bandana', 110, 80);
    // Coroa dourada com pedra vermelha.
    const coroa = [{ x: 6, y: 60 }, { x: 6, y: 18 }, { x: 24, y: 36 }, { x: 40, y: 6 },
        { x: 56, y: 36 }, { x: 74, y: 18 }, { x: 74, y: 60 }];
    g.clear().fillStyle(0xffc629).fillPoints(coroa, true).lineStyle(5, contorno).strokePoints(coroa, true);
    g.fillStyle(0xfff0a0).fillRect(10, 46, 60, 5);
    g.fillStyle(0xd9452f).fillCircle(40, 42, 6).lineStyle(3, contorno).strokeCircle(40, 42, 6);
    g.generateTexture('ac_coroa', 80, 66);
    // Capacete espacial: bolha transparente com brilho e gola.
    g.clear().fillStyle(0xbfeeff, 0.22).fillCircle(90, 88, 82);
    g.lineStyle(6, 0xeaf8ff, 0.95).strokeCircle(90, 88, 82);
    g.lineStyle(7, 0xffffff, 0.8);
    g.beginPath();
    g.arc(90, 88, 64, Math.PI * 1.1, Math.PI * 1.45);
    g.strokePath();
    g.fillStyle(0xc9ccd6).fillRoundedRect(40, 158, 100, 18, 8).lineStyle(4, contorno).strokeRoundedRect(40, 158, 100, 18, 8);
    g.generateTexture('ac_capacete', 180, 180);
    // Tronco cortado visto de frente, com os aneis, para o placar de troncos.
    g.clear().fillStyle(0x6b3f22).fillCircle(24, 24, 21).lineStyle(4, 0x2a1410).strokeCircle(24, 24, 21);
    g.fillStyle(0xe8b77e).fillCircle(24, 24, 15);
    g.lineStyle(2.2, 0xb07845);
    [10, 5.5].forEach((raio) => g.strokeCircle(24, 24, raio));
    g.fillStyle(0xb07845).fillCircle(24, 24, 2);
    g.generateTexture('ic_tronco', 48, 48);
    // Sacolinha de compras da placa LOJA.
    g.clear().lineStyle(7, 0x4d2710);
    g.beginPath();
    g.arc(60, 40, 18, Math.PI, 0);
    g.strokePath();
    g.fillStyle(0xf4c58a).fillRoundedRect(20, 38, 80, 74, 10).lineStyle(7, 0x4d2710).strokeRoundedRect(20, 38, 80, 74, 10);
    desenharPatinha(g, 60, 76, 0.75, 0x9a5a2c);
    g.generateTexture('ic_sacola', 120, 120);
}

// Menu vivo sem mexer na arte (as placas fazem parte da pintura): uma faixa de brilho passa
// pelo letreiro e pela placa INICIAR, estrelinhas piscam em volta dela e cada placa escurece
// um instante ao ser tocada. Devolve os objetos criados, para acompanharem o menu.
function animarMenu(cena, xArte, yArte, escala, botoesMenu) {
    const extras = [];
    const fixo = (objeto, profundidade = 20.5) => {
        extras.push(objeto.setScrollFactor(0).setDepth(profundidade));
        return objeto;
    };
    // Formas aproximadas (em pixels da arte) do letreiro e das tres placas.
    const formas = [
        { x: 170, y: 385, largura: 590, altura: 255, raio: 120 },
        { x: 247, y: 713, largura: 452, altura: 92, raio: 40 },
        { x: 252, y: 830, largura: 442, altura: 93, raio: 40 },
        { x: 252, y: 945, largura: 446, altura: 90, raio: 40 }
    ].map((forma) => ({
        x: xArte(forma.x), y: yArte(forma.y),
        largura: forma.largura * escala, altura: forma.altura * escala, raio: forma.raio * escala
    }));
    const brilho = (forma, intervalo, atraso) => {
        const mascara = cena.make.graphics({ add: false }).fillStyle(0xffffff)
            .fillRoundedRect(forma.x, forma.y, forma.largura, forma.altura, forma.raio);
        extras.push(mascara);
        const faixa = fixo(cena.add.image(forma.x - 40, forma.y + forma.altura / 2, 'fx_faixa')
            .setAngle(18).setBlendMode('ADD').setAlpha(0.9)
            .setScale(1, (forma.altura + 60) / 240), 20.4);
        faixa.setMask(mascara.createGeometryMask());
        cena.tweens.add({
            targets: faixa, x: forma.x + forma.largura + 40, duration: 800, ease: 'Sine.easeInOut',
            delay: atraso, repeat: -1, repeatDelay: intervalo
        });
    };
    brilho(formas[0], 4200, 900);
    brilho(formas[1], 2600, 1500);
    // Estrelinhas aparecendo e sumindo em volta da placa INICIAR.
    const iniciar = formas[1];
    fixo(cena.add.particles(0, 0, 'fx_estrela', {
        x: { min: iniciar.x, max: iniciar.x + iniciar.largura },
        y: { min: iniciar.y - 6, max: iniciar.y + iniciar.altura + 6 },
        lifespan: 900, frequency: 380, quantity: 1,
        // Cresce e some: o tamanho segue meia onda ao longo da vida da estrelinha.
        scale: { onEmit: () => 0, onUpdate: (particula, chave, t) => Math.sin(t * Math.PI) * 0.5 },
        rotate: { start: 0, end: 90 }, tint: [0xfff4b0, 0xffe165, 0xffffff], blendMode: 'ADD'
    }), 20.6);
    // Ao tocar, a placa escurece um instante, como um botao sendo apertado.
    botoesMenu.forEach((botao, i) => {
        const forma = formas[i + 1];
        const aperto = fixo(cena.add.graphics().fillStyle(0x1a0e08, 1)
            .fillRoundedRect(forma.x, forma.y, forma.largura, forma.altura, forma.raio).setAlpha(0), 20.45);
        botao.on('pointerdown', () => {
            cena.tweens.killTweensOf(aperto);
            aperto.setAlpha(0.28);
            cena.tweens.add({ targets: aperto, alpha: 0, duration: 260, ease: 'Quad.easeOut' });
        });
    });
    return extras;
}

// Duas borboletas voando pelo menu, entre o letreiro e o gato da arte.
function criarBorboletasMenu(cena, yArte) {
    return [[0xffd24a, 0], [0xf6a6c8, 1]].map(([cor, i]) => {
        const borboleta = cena.add.image(i ? 300 : 60, yArte(1150), 'fx_borboleta').setTint(cor).setScale(0.6);
        cena.tweens.add({ targets: borboleta, scaleX: 0.12, duration: 110, yoyo: true, repeat: -1, delay: i * 70 });
        const voar = () => {
            if (!borboleta.active) return;
            const destinoX = Phaser.Math.Between(30, 330);
            borboleta.setFlipX(destinoX < borboleta.x);
            cena.tweens.add({
                targets: borboleta, x: destinoX, y: yArte(Phaser.Math.Between(1080, 1330)),
                duration: Phaser.Math.Between(1800, 3000), ease: 'Sine.easeInOut', onComplete: voar
            });
        };
        voar();
        return borboleta;
    });
}

// Duas borboletas passeando pelo gramado do comeco da subida.
function criarBorboletas(cena) {
    [[60, 0xffd24a], [300, 0xf6a6c8]].forEach(([x, cor], i) => {
        const borboleta = cena.add.image(x, alturaChao - 50, 'fx_borboleta')
            .setTint(cor).setScale(0.7).setDepth(6);
        cena.tweens.add({
            targets: borboleta, scaleX: 0.15, duration: 110,
            yoyo: true, repeat: -1, delay: i * 70
        });
        const voar = () => {
            // Depois que a camera sobe, a borboleta fica para tras e para de voar.
            if (borboleta.y > cena.cameras.main.scrollY + config.height + 80) {
                cena.tweens.killTweensOf(borboleta);
                borboleta.destroy();
                return;
            }
            const destinoX = Phaser.Math.Between(24, 336);
            borboleta.setFlipX(destinoX < borboleta.x);
            cena.tweens.add({
                targets: borboleta, x: destinoX, y: alturaChao - Phaser.Math.Between(18, 110),
                duration: Phaser.Math.Between(1600, 2800), ease: 'Sine.easeInOut', onComplete: voar
            });
        };
        voar();
    });
}

// Bichinhos que passam atras dos troncos, so para enfeitar, de acordo com a fase do ceu
// (os bandos, que estao longe, passam atras ate do tronco da arvore):
// borboletas de dia e no fim de tarde, bandos de passarinhos ate o por do sol e
// vaga-lumes a noite. Ficam menores e mais apagados que o passaro inimigo.
function atualizarVidaFundo(cena, delta) {
    const fundo = cena.vidaFundo;
    const fase = cena.ceu.fase;
    fundo.esperaBorboleta -= delta;
    fundo.esperaBando -= delta;
    fundo.esperaVagalume -= delta;
    if (fundo.esperaBorboleta <= 0 && fase <= 1) {
        criarBorboletaFundo(cena);
        // Mais comuns perto do chao e mais raras no fim de tarde.
        fundo.esperaBorboleta = fase === 0
            ? Phaser.Math.Between(4000, 7500) : Phaser.Math.Between(9000, 15000);
    }
    if (fundo.esperaBando <= 0 && fase <= 2) {
        criarBandoFundo(cena);
        fundo.esperaBando = cena.contador < 15
            ? Phaser.Math.Between(11000, 16000) : Phaser.Math.Between(7000, 12000);
    }
    if (fundo.esperaVagalume <= 0 && fase === 3) {
        criarVagalume(cena);
        fundo.esperaVagalume = Phaser.Math.Between(500, 1300);
    }
}

// Pontinho de luz que vaga devagar e pisca.
function criarVagalume(cena) {
    const paralaxe = 0.25;
    const camera = cena.cameras.main;
    const inicioX = Phaser.Math.Between(20, config.width - 20);
    const inicioY = Phaser.Math.Between(120, config.height - 120) + camera.scrollY * paralaxe;
    const destinoX = inicioX + Phaser.Math.Between(-60, 60);
    const destinoY = inicioY + Phaser.Math.Between(-50, 30);
    const luz = (cor, escala) => cena.add.image(inicioX, inicioY, 'fx_ponto').setTint(cor).setScale(escala)
        .setBlendMode('ADD').setAlpha(0).setScrollFactor(1, paralaxe).setDepth(-1.5);
    const halo = luz(0xb8ff3a, 1.1);
    const miolo = luz(0xf6ff9a, 0.38);
    const duracao = Phaser.Math.Between(4000, 7000);
    const piscadas = Phaser.Math.Between(2, 3);
    cena.tweens.addCounter({
        from: 0, to: 1, duration: duracao, ease: 'Sine.easeInOut',
        onUpdate: (contagem) => {
            const t = contagem.getValue();
            const x = Phaser.Math.Linear(inicioX, destinoX, t);
            const y = Phaser.Math.Linear(inicioY, destinoY, t) + Math.sin(t * 9) * 6;
            // Acende e apaga algumas vezes durante o voo.
            const brilho = Math.max(0, Math.sin(t * Math.PI * piscadas));
            halo.setPosition(x, y).setAlpha(brilho * 0.45);
            miolo.setPosition(x, y).setAlpha(brilho);
        },
        onComplete: () => {
            halo.destroy();
            miolo.destroy();
        }
    });
}

function criarBorboletaFundo(cena) {
    // Paralaxe parcial: fica entre o cenario e os troncos, descendo devagar quando a camera sobe.
    const paralaxe = 0.25;
    const camera = cena.cameras.main;
    const direcao = Math.random() < 0.5 ? 1 : -1;
    const inicioX = direcao > 0 ? -20 : config.width + 20;
    const baseY = Phaser.Math.Between(140, config.height - 200) + camera.scrollY * paralaxe;
    const subida = Phaser.Math.Between(-60, 40);
    const zigue = Phaser.Math.FloatBetween(3, 5);
    const cor = Phaser.Utils.Array.GetRandom([0xffd24a, 0xf6a6c8, 0x9fd3ff, 0xffffff, 0xff9f5a]);
    const borboleta = cena.add.image(inicioX, baseY, 'fx_borboleta')
        .setTint(cor).setScale(0.55).setAlpha(0.9).setFlipX(direcao < 0)
        .setScrollFactor(1, paralaxe).setDepth(-1.5);
    cena.tweens.add({ targets: borboleta, scaleX: 0.12, duration: 120, yoyo: true, repeat: -1 });
    cena.tweens.addCounter({
        from: 0, to: 1, duration: Phaser.Math.Between(7000, 10000),
        onUpdate: (contagem) => {
            const t = contagem.getValue();
            borboleta.x = inicioX + direcao * (config.width + 40) * t;
            borboleta.y = baseY + subida * t + Math.sin(t * Math.PI * 2 * zigue) * 22;
        },
        onComplete: () => {
            cena.tweens.killTweensOf(borboleta);
            borboleta.destroy();
        }
    });
}

function criarBandoFundo(cena) {
    const paralaxe = 0.15;
    const camera = cena.cameras.main;
    const direcao = Math.random() < 0.5 ? 1 : -1;
    const quantidade = Phaser.Math.Between(3, 5);
    const baseY = Phaser.Math.Between(110, Math.round(config.height * 0.45)) + camera.scrollY * paralaxe;
    const inicioX = direcao > 0 ? -60 : config.width + 60;
    // Formacao em V: o primeiro na frente, os outros para tras e para os lados.
    const aves = [];
    for (let i = 0; i < quantidade; i++) {
        const fileira = Math.ceil(i / 2);
        const lado = i % 2 === 0 ? 1 : -1;
        aves.push({
            imagem: cena.add.image(0, 0, 'fx_ave_fundo_a')
                .setTint(0x3b2f2a).setAlpha(0.55).setScale(Phaser.Math.FloatBetween(0.42, 0.55))
                .setScrollFactor(1, paralaxe).setDepth(-2.5),
            atrasX: -direcao * fileira * Phaser.Math.Between(14, 20),
            ladoY: lado * fileira * Phaser.Math.Between(8, 12),
            fase: Phaser.Math.FloatBetween(0, 1)
        });
    }
    const duracao = Phaser.Math.Between(9000, 13000);
    cena.tweens.addCounter({
        from: 0, to: 1, duration: duracao,
        onUpdate: (contagem) => {
            const t = contagem.getValue();
            const segundos = t * duracao / 1000;
            const x = inicioX + direcao * (config.width + 120) * t;
            const y = baseY - 30 * t;
            aves.forEach((ave) => {
                const batida = Math.floor((segundos + ave.fase) * 6) % 2;
                ave.imagem.setTexture(batida ? 'fx_ave_fundo_b' : 'fx_ave_fundo_a')
                    .setPosition(x + ave.atrasX, y + ave.ladoY + Math.sin(segundos * 2 + ave.fase * 6) * 2);
            });
        },
        onComplete: () => aves.forEach((ave) => ave.imagem.destroy())
    });
}

// Passaros inimigos cruzam a tela a partir de certa altura, ate a noite; no espaco
// viram OVNIs. Um "!" na borda avisa um instante antes; o esbarrao derruba
// granulados, mas o jogo continua.
function atualizarPassaros(cena, delta) {
    const noEspaco = cena.ceu.fase >= faseEspaco;
    if (cena.contador >= troncoPassaros) {
        cena.esperaPassaro -= delta;
        if (cena.esperaPassaro <= 0) {
            if (noEspaco) {
                // OVNIs cada vez mais frequentes e, as vezes, em dupla, para nao virar padrao.
                const alem = cena.contador - fasesCeu[faseEspaco].troncos;
                criarPassaro(cena, true);
                if (Math.random() < Phaser.Math.Clamp(alem / 150, 0.1, 0.5)) criarPassaro(cena, true, 0.6);
                const intervalo = Phaser.Math.Clamp(4600 - alem * 15, 2300, 4600);
                cena.esperaPassaro = Phaser.Math.Between(intervalo - 900, intervalo + 900);
            } else {
                criarPassaro(cena);
                // Ficam mais frequentes conforme o gato sobe.
                const intervalo = Phaser.Math.Clamp(9000 - (cena.contador - troncoPassaros) * 45, 3800, 9000);
                cena.esperaPassaro = Phaser.Math.Between(intervalo - 1200, intervalo + 1200);
            }
        }
    }
    const segundos = delta / 1000;
    const camera = cena.cameras.main;
    const corpo = cena.caixa.body;
    const agora = cena.time.now;
    const protegido = agora < (cena.caixa.protegidoAte || 0) || agora < (cena.caixa.turboAte || 0);
    for (let i = cena.passaros.length - 1; i >= 0; i--) {
        const passaro = cena.passaros[i];
        const imagem = passaro.imagem;
        passaro.tempo += segundos;
        if (passaro.ovni) {
            // O OVNI pode parar um instante no meio da tela e depois disparar mais rapido.
            if (passaro.pararEm !== null && !passaro.acertou &&
                (passaro.direcao > 0 ? imagem.x >= passaro.pararEm : imagem.x <= passaro.pararEm)) {
                passaro.pararEm = null;
                passaro.paradoAte = passaro.tempo + 0.7;
                passaro.velocidade *= 1.7;
            }
            if (passaro.tempo >= (passaro.paradoAte || 0)) imagem.x += passaro.direcao * passaro.velocidade * segundos;
            if (passaro.acertou) passaro.yBase -= 220 * segundos;
            imagem.y = passaro.yBase + Math.sin(passaro.tempo * passaro.onda) * passaro.amplitude;
            imagem.setTexture(Math.floor(passaro.tempo * 6) % 2 ? 'fx_ovni_b' : 'fx_ovni_a');
        } else {
            imagem.x += passaro.direcao * passaro.velocidade * segundos;
            // Depois da bicada ele sobe e vai embora.
            if (passaro.acertou) passaro.yBase -= 170 * segundos;
            imagem.y = passaro.yBase + Math.sin(passaro.tempo * 7) * 5;
            imagem.setTexture(Math.floor(passaro.tempo * 10) % 2 ? 'fx_passaro_b' : 'fx_passaro_a');
        }
        if (passaro.alerta) {
            const entrou = passaro.direcao > 0 ? imagem.x > 0 : imagem.x < config.width;
            if (entrou) {
                passaro.alerta.destroy();
                passaro.alerta = null;
            } else {
                passaro.alerta.setScale(1 + Math.sin(passaro.tempo * 16) * 0.15);
            }
        }
        if (!passaro.acertou && !protegido && !cena.morreu &&
            Math.abs(imagem.x - corpo.center.x) < corpo.halfWidth + (passaro.ovni ? 22 : 16) &&
            Math.abs(imagem.y - corpo.center.y) < corpo.halfHeight + (passaro.ovni ? 8 : 10)) {
            if (cena.poderes.escudo) defenderComEscudo(cena, passaro);
            else bicarGato(cena, passaro);
        }
        const saiu = passaro.direcao > 0 ? imagem.x > config.width + 50 : imagem.x < -50;
        if (saiu || imagem.y > camera.scrollY + config.height + 60) {
            if (passaro.alerta) passaro.alerta.destroy();
            imagem.destroy();
            cena.passaros.splice(i, 1);
        }
    }
}

// O segundo OVNI de uma dupla (atrasoAviso > 0) vem do outro lado, um pouco depois.
function criarPassaro(cena, ovni = false, atrasoAviso = 0) {
    const camera = cena.cameras.main;
    const outro = cena.passaros[cena.passaros.length - 1];
    const direcao = atrasoAviso && outro ? -outro.direcao : (Math.random() < 0.5 ? 1 : -1);
    const velocidade = Phaser.Math.Between(130, 170) * cena.velocidadeJogo ** 0.7;
    // Cruza um pouco acima do gato, na altura por onde ele vai passar no proximo pulo.
    const y = Phaser.Math.Clamp(cena.caixa.y - Phaser.Math.Between(atrasoAviso ? 0 : 60, atrasoAviso ? 320 : 220),
        camera.scrollY + 120, camera.scrollY + config.height - 140);
    // Nasce fora da tela a cerca de um segundo de voo: e o tempo do aviso.
    const distanciaAviso = velocidade * (1.1 + atrasoAviso);
    const x = direcao > 0 ? -30 - distanciaAviso : config.width + 30 + distanciaAviso;
    const imagem = cena.add.image(x, y, ovni ? 'fx_ovni_a' : 'fx_passaro_a').setScale(ovni ? 0.6 : 0.7)
        .setFlipX(direcao < 0).setDepth(5.5);
    const alerta = cena.add.container(direcao > 0 ? 18 : config.width - 18, y, [
        cena.add.circle(0, 0, 13, 0xd9452f).setStrokeStyle(2.5, 0xfff4d6),
        cena.add.text(0, 0, '!', {
            resolution: 4, fontFamily: 'Arial', fontSize: '19px', fontStyle: 'bold', color: '#fff4d6'
        }).setOrigin(0.5)
    ]).setDepth(9);
    const passaro = { imagem, alerta, direcao, velocidade, yBase: y, tempo: 0, acertou: false, ovni };
    if (ovni) {
        // Cada OVNI balanca de um jeito, e metade deles para um pouco no meio do caminho.
        passaro.onda = Phaser.Math.FloatBetween(2.5, 4.5);
        passaro.amplitude = Phaser.Math.Between(25, 60);
        passaro.pararEm = Math.random() < 0.5 ? Phaser.Math.Between(90, 270) : null;
        passaro.paradoAte = 0;
        som.alertaOvni();
    } else {
        som.alertaPassaro();
    }
    cena.passaros.push(passaro);
}

function bicarGato(cena, passaro) {
    passaro.acertou = true;
    cena.bicadas += 1;
    quebrarCombo(cena);
    const caixa = cena.caixa;
    const agora = cena.time.now;
    // Um instante protegido, piscando, para outra bicada nao vir em seguida.
    caixa.protegidoAte = agora + 1500;
    // Fica tonto um instante; depois volta a pose de pulo ou de queda.
    caixa.machucadoAte = agora + 550;
    caixa.setTexture(texturaPose(cena, 'machucado')).setDisplaySize(78, 80);
    // Empurrao curto para o lado em que o passaro voava.
    caixa.empurrao = { velocidade: passaro.direcao * 230 * cena.velocidadeJogo, ate: agora + 170 };
    if (passaro.ovni) {
        som.choqueOvni();
        cena.efeitos.brilho.explode(12, passaro.imagem.x, passaro.imagem.y);
    } else {
        som.bicada();
        cena.efeitos.penas.explode(7, passaro.imagem.x, passaro.imagem.y);
    }
    cena.cameras.main.shake(150, 0.006);
    deformarGato(cena, 0.8, 1.2, 380);
    const perdidos = Math.min(granuladosBicada, cena.totalMoedas);
    if (perdidos > 0) {
        cena.totalMoedas -= perdidos;
        cena.vigia.moedas -= perdidos;
        atualizarHud(cena);
        pulsarHud(cena, cena.hud.granulados);
        cena.efeitos.granulos.explode(perdidos * 2, caixa.x, caixa.y);
        mostrarPopup(cena, caixa.x, caixa.y - 50, '-' + perdidos, '#ff8a6a', 18);
    }
    cena.tweens.killTweensOf(cena.gato);
    cena.gato.setAlpha(1);
    cena.tweens.add({
        targets: cena.gato, alpha: 0.35, duration: 110, yoyo: true, repeat: 6,
        onComplete: () => cena.gato.setAlpha(1)
    });
}

function criarFolhas(cena, profundidade, intervalo) {
    return cena.add.particles(0, 0, 'fx_folha', {
        x: { min: -10, max: 370 }, y: -12,
        lifespan: 16000, frequency: intervalo,
        speedY: { min: 40, max: 70 }, speedX: { min: -30, max: 30 },
        rotate: { start: 0, end: 720 }, scale: { min: 0.45, max: 0.8 }, alpha: 0.85,
        tint: [0x7cae3a, 0x9fc94a, 0x5d8f2b, 0xc9b84a]
    }).setScrollFactor(0).setDepth(profundidade);
}

function configurarAtalhos(cena) {
    const tecla = (evento) => {
        som.iniciar();
        if (evento.repeat) return;
        if (evento.code === 'KeyP' || evento.code === 'Escape') {
            alternarPausa(cena);
        } else if (evento.code === 'KeyM') {
            som.alternarMudo();
            if (cena.hud) cena.hud.botaoSom.desenhar();
        }
    };
    cena.input.keyboard.on('keydown', tecla);
    cena.events.once('shutdown', () => cena.input.keyboard.off('keydown', tecla));
}

// Placar no estilo de madeira da loja: troncos numa etiqueta a esquerda, granulados numa
// placa no meio e pausa e som em botoes redondos a direita.
function criarHud(cena) {
    const estiloNumero = (tamanho) => ({
        resolution: 4, fontFamily: 'Arial Black, Arial, sans-serif', fontSize: tamanho + 'px', fontStyle: 'bold',
        color: '#4d2710', stroke: '#f6c98f', strokeThickness: 3
    });
    const fixo = (objeto) => objeto.setScrollFactor(0).setDepth(10);
    // Sombra suave embaixo de cada peca, para destacar do tronco laranja atras.
    const sombra = (largura, altura, raio) => cena.add.graphics().fillStyle(0x1a0e08, 0.35)
        .fillRoundedRect(-largura / 2 + 1, -altura / 2 + 3, largura - 2, altura, raio);
    const fundo = cena.add.image(0, 0, texturaMadeira(cena, 116, 40, { raio: 14 })).setScale(1 / escalaMadeira);
    const icone = cena.add.image(-34, 0, 'moeda').setScale(26 / larguraGranulado).setAngle(-12);
    const texto = cena.add.text(-16, 1, '0', estiloNumero(19)).setOrigin(0, 0.5);
    const granulados = fixo(cena.add.container(180, 26, [sombra(112, 36, 13), fundo, icone, texto]));
    const fundoTroncos = cena.add.image(0, 0, texturaMadeira(cena, 88, 32, { raio: 11, escurecer: 0.12 })).setScale(1 / escalaMadeira);
    const iconeTroncos = cena.add.image(-24, 0, 'ic_tronco').setScale(0.46);
    const textoTroncos = cena.add.text(-12, 1, '0', estiloNumero(15)).setOrigin(0, 0.5);
    const troncos = fixo(cena.add.container(56, 26, [sombra(84, 28, 10), fundoTroncos, iconeTroncos, textoTroncos]));
    const botaoPausa = criarBotaoHud(cena, 294, desenharIconePausa, () => alternarPausa(cena));
    const botaoSom = criarBotaoHud(cena, 336, desenharIconeSom, () => som.alternarMudo());
    // Sequencia de granulados (combo), embaixo da placa; so aparece a partir de 2 seguidos.
    const textoCombo = cena.add.text(0, -1, '', {
        resolution: 4, fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#fff4d6',
        stroke: '#2a1410', strokeThickness: 3
    }).setOrigin(0.5);
    const barraCombo = cena.add.graphics();
    const combo = fixo(cena.add.container(180, 57, [
        cena.add.image(0, 2, texturaMadeira(cena, 100, 28, { raio: 10, escurecer: 0.3 })).setScale(1 / escalaMadeira),
        textoCombo, barraCombo
    ])).setVisible(false);
    cena.hud = { granulados, icone, texto, troncos, textoTroncos, botaoSom, combo, textoCombo, barraCombo };
    atualizarHud(cena);
    // Entram caindo do alto, um de cada vez.
    [troncos, granulados, botaoPausa.botao, botaoSom.botao].forEach((item, i) => {
        item.setAlpha(0);
        item.y -= 30;
        cena.tweens.add({
            targets: item, alpha: 1, y: 26, duration: 420,
            delay: 400 + i * 80, ease: 'Back.easeOut'
        });
    });
    if (previaCenario) criarBotaoSubir(cena);
}

// So na previa do cenario: um super pulo para ver a arte inteira rapido, com a altura ao lado.
function criarBotaoSubir(cena) {
    const botao = cena.add.text(10, 58, '▲ SUBIR', {
        resolution: 4, fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold',
        color: '#382017', backgroundColor: '#ffd24a', padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(12).setInteractive({ useHandCursor: true });
    botao.on('pointerdown', (ponteiro, xLocal, yLocal, evento) => {
        // Nao deixa o toque retomar a pausa.
        evento.stopPropagation();
        if (!cena.iniciado || cena.morreu || cena.pausado) return;
        aplicarImpulsoDourado(cena.caixa, 1500);
    });
    const altura = cena.add.text(84, 70, '', {
        resolution: 4, fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
        color: corTexto, stroke: '#1a0e08', strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(12);
    const mostrar = () => altura.setText(`${Math.floor(cena.alturaMax / alturaPorTronco)} troncos de altura`);
    mostrar();
    cena.events.on('update', mostrar);
    cena.events.once('shutdown', () => cena.events.off('update', mostrar));
}

// Botao redondo de madeira com um icone claro desenhado por cima.
function criarBotaoHud(cena, x, desenharIcone, acao) {
    const fundo = cena.add.image(0, 0, texturaMadeira(cena, 40, 40, { raio: 18 })).setScale(1 / escalaMadeira);
    const icone = cena.add.graphics();
    const sombra = cena.add.graphics().fillStyle(0x1a0e08, 0.35).fillCircle(0, 3, 18);
    const botao = cena.add.container(x, 26, [sombra, fundo, icone]).setSize(44, 44)
        .setScrollFactor(0).setDepth(12).setInteractive({ useHandCursor: true });
    const desenhar = () => {
        icone.clear();
        desenharIcone(icone);
    };
    botao.on('pointerdown', (ponteiro, xLocal, yLocal, evento) => {
        // Nao deixa o toque no botao retomar a pausa ou reiniciar a partida.
        evento.stopPropagation();
        som.iniciar();
        acao();
        desenhar();
        som.clique();
        cena.tweens.killTweensOf(botao);
        botao.setScale(0.82);
        cena.tweens.add({ targets: botao, scale: 1, duration: 260, ease: 'Back.easeOut' });
    });
    desenhar();
    return { botao, desenhar };
}

// Celular com uma seta para baixo, para o botao de instalar.
function desenharIconeInstalar(g) {
    g.fillStyle(0xfff4d6, 1).lineStyle(2.5, 0x4d2710, 1)
        .fillRoundedRect(-8, -13, 16, 26, 3).strokeRoundedRect(-8, -13, 16, 26, 3);
    g.fillStyle(0x4d2710, 1).fillRect(-2, 9, 4, 1.5);
    g.lineStyle(3.2, 0x3f8a4c, 1).lineBetween(0, -8, 0, 4);
    g.fillStyle(0x3f8a4c, 1).fillTriangle(-5.5, 1, 5.5, 1, 0, 7.5);
}

// Pergaminho com lista e um visto, para o botao das missoes.
function desenharIconeMissoes(g) {
    g.fillStyle(0xfff4d6, 1).lineStyle(2.5, 0x4d2710, 1)
        .fillRoundedRect(-10, -12, 20, 24, 4).strokeRoundedRect(-10, -12, 20, 24, 4);
    g.lineStyle(2, 0x9a6a44, 1);
    [-5, 0, 5].forEach((y) => g.lineBetween(-5, y, 5, y));
    g.lineStyle(3, 0x3f8a4c, 1).lineBetween(2, 8, 5, 11).lineBetween(5, 11, 12, 2);
}

// Icones claros com contorno marrom, legiveis sobre a madeira.
function desenharIconePausa(g) {
    g.fillStyle(0xfff4d6, 1).lineStyle(2.5, 0x4d2710, 1);
    [-5, 1.5].forEach((x) => g.fillRoundedRect(x, -7.5, 4.5, 15, 1.5).strokeRoundedRect(x, -7.5, 4.5, 15, 1.5));
}

function desenharIconeSom(g) {
    const alto = [
        { x: -9, y: -3.5 }, { x: -4.5, y: -3.5 }, { x: 1, y: -8.5 },
        { x: 1, y: 8.5 }, { x: -4.5, y: 3.5 }, { x: -9, y: 3.5 }
    ];
    g.fillStyle(0xfff4d6, 1).fillPoints(alto, true).lineStyle(2.5, 0x4d2710, 1).strokePoints(alto, true);
    if (som.mudo) {
        g.lineStyle(5, 0x4d2710, 1).lineBetween(4, -4.5, 10, 4.5).lineBetween(10, -4.5, 4, 4.5);
        g.lineStyle(2.5, 0xff8a6a, 1).lineBetween(4, -4.5, 10, 4.5).lineBetween(10, -4.5, 4, 4.5);
        return;
    }
    [4.5, 8.5].forEach((raio) => {
        g.lineStyle(5, 0x4d2710, 1);
        g.beginPath();
        g.arc(1, 0, raio, -0.85, 0.85);
        g.strokePath();
        g.lineStyle(2.2, 0xfff4d6, 1);
        g.beginPath();
        g.arc(1, 0, raio, -0.85, 0.85);
        g.strokePath();
    });
}

function atualizarHud(cena) {
    const hud = cena.hud;
    if (!hud) return;
    hud.texto.setText(String(cena.totalMoedas));
    // Icone e numero ficam centralizados na placa, com qualquer quantidade de digitos.
    const largura = 26 + 6 + hud.texto.width;
    hud.icone.x = -largura / 2 + 13;
    hud.texto.x = hud.icone.x + 19;
    hud.textoTroncos.setText(String(cena.contador));
}

function pulsarHud(cena, alvo) {
    cena.tweens.killTweensOf(alvo);
    alvo.setScale(1.25).setAlpha(1).setY(26);
    cena.tweens.add({ targets: alvo, scale: 1, duration: 300, ease: 'Back.easeOut' });
}

// Granulado pego voa da posicao dele na tela ate o icone da placa.
function voarParaPlacar(cena, x, y, textura, escala) {
    const hud = cena.hud;
    if (!hud) return;
    const camera = cena.cameras.main;
    const voando = cena.add.image(x, y - camera.scrollY, textura).setScale(escala)
        .setScrollFactor(0).setDepth(11);
    const destinoX = hud.granulados.x + hud.icone.x;
    cena.tweens.add({
        targets: voando, x: destinoX, y: hud.granulados.y, scale: 26 / larguraGranulado, angle: 360,
        duration: 420, ease: 'Quad.easeIn',
        onComplete: () => {
            voando.destroy();
            cena.tweens.killTweensOf(hud.icone);
            hud.icone.setScale(26 / larguraGranulado * 1.5);
            cena.tweens.add({ targets: hud.icone, scale: 26 / larguraGranulado, duration: 260, ease: 'Back.easeOut' });
        }
    });
}

function alternarPausa(cena, pausar = !cena.pausado) {
    if (!cena.iniciado || cena.morreu || cena.pegandoTrapaceiro || pausar === cena.pausado) return;
    cena.pausado = pausar;
    if (!pausar) {
        cena.telaPausa.destroy();
        cena.telaPausa = null;
        cena.physics.resume();
        cena.tweens.resumeAll();
        musica.tocar(false);
        return;
    }
    cena.pausadoEm = cena.time.now;
    cena.physics.pause();
    cena.tweens.pauseAll();
    musica.parar();
    const sombra = cena.add.rectangle(180, config.height / 2, 360, config.height, 0x160d08, 0.72);
    const centro = config.height / 2;
    const titulo = cena.add.text(180, centro - 160, 'PAUSADO', {
        resolution: 4, fontFamily: 'Arial', fontSize: '34px', fontStyle: 'bold',
        color: corTexto, stroke: '#1a0e08', strokeThickness: 6
    }).setOrigin(0.5);
    const dica = cena.add.text(180, centro - 118,
        'Toque na tela para continuar', {
        resolution: 4, fontFamily: 'Arial', fontSize: '15px', color: '#f4ddc9',
        align: 'center', lineSpacing: 4
    }).setOrigin(0.5);
    const opcoes = criarOpcoesSom(cena, centro - 60);
    const continuar = criarBotaoMadeira(cena, 180, centro + 100, 200, 50, 'CONTINUAR',
        () => alternarPausa(cena, false));
    const menu = criarBotaoMadeira(cena, 180, centro + 162, 200, 50, 'MENU',
        () => voltarAoMenu(cena), { cor: 0xd9c2a8 });
    // Fica abaixo dos botoes, para o som continuar acessivel na pausa.
    cena.telaPausa = cena.add.container(0, 0, [sombra, titulo, dica, ...opcoes, continuar, menu])
        .setScrollFactor(0).setDepth(11);
}

// Primeira partida: uma mao arrasta de um lado para o outro na metade de baixo da tela,
// mostrando como andar. Some quando o jogador arrasta o dedo (ou usa o teclado) por um tempinho.
function mostrarMaoTutorial(cena) {
    const y = config.height - 150;
    // Mao com o indicador para cima; a ponta do dedo e onde o toque encosta na tela.
    // Primeiro a silhueta escura um pouco maior, depois o preenchimento claro por cima.
    const formas = (folga) => {
        // Indicador na ponta esquerda da palma, tres dedos dobrados a direita e o polegar aberto.
        mao.fillRoundedRect(-11 - folga, -32 - folga, 10.5 + folga * 2, 34 + folga * 2, 5.25 + folga);
        mao.fillRoundedRect(-12 - folga, -8 - folga, 29 + folga * 2, 27 + folga * 2, 9 + folga);
        mao.fillCircle(3.5, -6, 4.8 + folga).fillCircle(9.5, -5, 4.6 + folga).fillCircle(14.5, -2, 4.3 + folga);
        mao.fillEllipse(-15, 8, 9 + folga * 2, 17 + folga * 2);
    };
    const mao = cena.add.graphics();
    mao.fillStyle(0x4d2710, 1);
    formas(2.5);
    mao.fillStyle(0xfff4d6, 1);
    formas(0);
    mao.lineStyle(1.6, 0xc9a06a, 1).lineBetween(6.5, -4, 6.5, 2).lineBetween(12, -1, 12, 4);
    mao.fillStyle(0x4d2710, 1).fillRoundedRect(-13.5, 17, 32, 12, 3);
    mao.fillStyle(0x3d8fd9, 1).fillRoundedRect(-11, 19.5, 27, 7, 2);
    const toque = cena.add.circle(-5.75, -30, 10, 0xffffff, 0.35).setStrokeStyle(2, 0xffffff, 0.8);
    const texto = cena.add.text(0, -70, 'Arraste o dedo aqui embaixo', {
        resolution: 4, fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#fff4d6',
        stroke: '#2a1410', strokeThickness: 5
    }).setOrigin(0.5);
    const seta = cena.add.text(0, -46, '◀   ▶', {
        resolution: 4, fontFamily: 'Arial', fontSize: '14px', color: '#fff4d6', stroke: '#2a1410', strokeThickness: 4
    }).setOrigin(0.5);
    const dedo = cena.add.container(110, y + 34, [toque, mao]).setAngle(-12);
    const grupo = cena.add.container(0, 0, [
        cena.add.container(180, y, [texto, seta]), dedo
    ]).setScrollFactor(0).setDepth(14).setAlpha(0);
    cena.tweens.add({ targets: grupo, alpha: 1, duration: 300 });
    cena.tweens.add({ targets: dedo, x: 250, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    cena.tweens.add({ targets: toque, scale: 1.6, alpha: 0, duration: 700, repeat: -1 });
    cena.maoTutorial = { grupo, arrastou: 0 };
}

function fecharMaoTutorial(cena) {
    const grupo = cena.maoTutorial.grupo;
    cena.maoTutorial = null;
    marcarDica(cena, 'mover');
    cena.tweens.add({ targets: grupo, alpha: 0, duration: 300, onComplete: () => grupo.destroy() });
}

function marcarDica(cena, chave) {
    if (cena.dicasVistas.includes(chave)) return;
    cena.dicasVistas.push(chave);
    salvarArmazenado(chaveDicas, cena.dicasVistas);
}

// Poe uma dica na fila, se ela nunca apareceu.
function pedirDica(cena, chave) {
    if (cena.dicasVistas.includes(chave) || cena.filaDicas.includes(chave)) return;
    cena.filaDicas.push(chave);
}

function atualizarDicas(cena, delta) {
    const mao = cena.maoTutorial;
    if (mao) {
        const ponteiro = cena.input.activePointer;
        const arrastando = (ponteiro.isDown && ponteiro.downY / escalaRenderizacao > config.height / 2) ||
            cena.cursors.left.isDown || cena.cursors.right.isDown ||
            cena.teclasLaterais.A.isDown || cena.teclasLaterais.D.isDown;
        if (arrastando) mao.arrastou += delta;
        if (mao.arrastou > 700) fecharMaoTutorial(cena);
    }
    // Procura, de vez em quando, coisas novas na tela que ainda nao tiveram dica.
    cena.esperaDicas -= delta;
    if (cena.esperaDicas <= 0) {
        cena.esperaDicas = 300;
        const vistas = cena.dicasVistas;
        const camera = cena.cameras.main;
        const naTela = (y) => y > camera.scrollY + 90 && y < camera.scrollY + config.height - 60;
        for (const plataforma of cena.plataformas.getChildren()) {
            if (!naTela(plataforma.y)) continue;
            if (plataforma.fragil && !vistas.includes('rachado')) pedirDica(cena, 'rachado');
            if (plataforma.mola && !vistas.includes('mola')) pedirDica(cena, 'mola');
        }
        if (cena.itensPoder.some((item) => naTela(item.y))) pedirDica(cena, 'poder');
        if (cena.passaros.length > 0) pedirDica(cena, 'passaro');
    }
    // Uma dica por vez, e so depois que a mao da primeira partida sumiu.
    if (!cena.dicaAberta && !cena.maoTutorial && cena.filaDicas.length > 0) {
        mostrarDica(cena, cena.filaDicas.shift());
    }
}

// Plaquinha de madeira embaixo do placar, por alguns segundos.
function mostrarDica(cena, chave) {
    marcarDica(cena, chave);
    const texto = cena.add.text(0, 1, dicasJogo[chave], {
        resolution: 4, fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#4d2710',
        align: 'center', wordWrap: { width: 290 }
    }).setOrigin(0.5);
    const largura = Math.min(330, texto.width + 34);
    const altura = texto.height + 18;
    const placa = cena.add.container(180, 108, [
        cena.add.graphics().fillStyle(0x1a0e08, 0.35).fillRoundedRect(-largura / 2 + 1, -altura / 2 + 3, largura - 2, altura, 12),
        cena.add.image(0, 0, texturaMadeira(cena, largura, altura, { raio: 12 })).setScale(1 / escalaMadeira),
        texto
    ]).setScrollFactor(0).setDepth(14).setAlpha(0).setScale(0.6);
    cena.dicaAberta = placa;
    cena.tweens.add({ targets: placa, alpha: 1, scale: 1, duration: 260, ease: 'Back.easeOut' });
    cena.tweens.add({
        targets: placa, alpha: 0, y: 96, delay: 3400, duration: 300, ease: 'Quad.easeIn',
        onComplete: () => {
            placa.destroy();
            if (cena.dicaAberta === placa) cena.dicaAberta = null;
        }
    });
}

// Botoes de liga e desliga da musica, dos efeitos e da vibracao (esta so onde o aparelho vibra).
function criarOpcoesSom(cena, y) {
    const nomes = { musica: ['MÚSICA', 'LIGADA', 'DESLIGADA'], efeitos: ['EFEITOS', 'LIGADOS', 'DESLIGADOS'] };
    if (navigator.vibrate) nomes.vibracao = ['VIBRAÇÃO', 'LIGADA', 'DESLIGADA'];
    return Object.keys(nomes).map((chave, i) => {
        const [nome, ligada, desligada] = nomes[chave];
        const pintar = () => {
            const ligado = som.opcoes[chave];
            botao.rotulo.setText(`${nome}: ${ligado ? ligada : desligada}`);
            botao.list[0].setTint(ligado ? 0xffffff : 0x8f8378);
        };
        const botao = criarBotaoMadeira(cena, 180, y + i * 46, 236, 38, '', () => {
            som.alternarOpcao(chave);
            pintar();
            if (chave === 'musica' && cena.iniciado && !cena.pausado && !cena.morreu) {
                if (som.opcoes.musica) musica.tocar(false);
                else musica.parar();
            }
        }, { tamanho: 14 });
        pintar();
        return botao;
    });
}

// Faixa curta no meio da tela para eventos da partida.
function mostrarFaixa(cena, titulo, subtitulo = '', cor = corTexto) {
    if (cena.faixa) cena.faixa.destroy();
    const itens = [
        cena.add.rectangle(180, 0, 360, subtitulo ? 64 : 46, corMadeiraEscura, 0.88),
        cena.add.text(180, subtitulo ? -10 : 0, titulo, {
            resolution: 4, fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold',
            color: cor, stroke: '#1a0e08', strokeThickness: 5
        }).setOrigin(0.5)
    ];
    if (subtitulo) {
        itens.push(cena.add.text(180, 17, subtitulo, {
            resolution: 4, fontFamily: 'Arial', fontSize: '13px', color: '#f4ddc9'
        }).setOrigin(0.5));
    }
    const faixa = cena.add.container(0, 190, itens).setScrollFactor(0).setDepth(15)
        .setAlpha(0).setScale(1, 0.3);
    cena.faixa = faixa;
    cena.tweens.add({ targets: faixa, alpha: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
    cena.tweens.add({
        targets: faixa, alpha: 0, y: 170, delay: 1300, duration: 320, ease: 'Quad.easeIn',
        onComplete: () => {
            faixa.destroy();
            if (cena.faixa === faixa) cena.faixa = null;
        }
    });
}

function mostrarPopup(cena, x, y, texto, cor = corTexto, tamanho = 16) {
    const popup = cena.add.text(x, y, texto, {
        resolution: 4, fontFamily: 'Arial', fontSize: tamanho + 'px', fontStyle: 'bold',
        color: cor, stroke: '#2a160d', strokeThickness: 4
    }).setOrigin(0.5).setDepth(7).setScale(0.6);
    // Nao deixa o texto sair pelas laterais da tela.
    popup.x = Phaser.Math.Clamp(x, popup.width / 2 + 6, config.width - popup.width / 2 - 6);
    cena.tweens.add({ targets: popup, y: y - 34, scale: 1, duration: 260, ease: 'Back.easeOut' });
    cena.tweens.add({
        targets: popup, alpha: 0, delay: 420, duration: 260,
        onComplete: () => popup.destroy()
    });
}

// Linha tracejada na altura do melhor resultado salvo.
function desenharLinhaRecorde(cena) {
    if (cena.recorde.altura < 80) return;
    const y = cena.cenario.alturaInicialGato + 40 - cena.recorde.altura;
    const linha = cena.add.graphics().setDepth(-1).lineStyle(2, 0xffe1a6, 0.8);
    for (let x = 4; x < config.width - 4; x += 14) linha.lineBetween(x, y, x + 8, y);
    const rotulo = cena.add.text(config.width - 8, y - 4, 'RECORDE', {
        resolution: 4, fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
        color: corTexto, stroke: '#2a160d', strokeThickness: 3
    }).setOrigin(1, 1).setDepth(-1);
    cena.linhaRecorde = [linha, rotulo];
}

function comemorarRecorde(cena) {
    mostrarFaixa(cena, 'NOVO RECORDE!', 'continue subindo!', '#ffd24a');
    som.recorde();
    cena.efeitos.brilho.explode(24, cena.caixa.x, cena.caixa.y);
    if (cena.linhaRecorde) {
        cena.tweens.add({ targets: cena.linhaRecorde, alpha: 0.25, duration: 600 });
    }
}

// Apresenta a pagina de quadrinhos um quadro por vez, com legenda digitada.
function mostrarHistoria(cena, aoTerminar, textoFinal) {
    const textura = cena.textures.get('historia');
    quadrosHistoria.forEach((quadro, i) => {
        // Uma pequena margem interna esconde a calha branca entre os quadros.
        if (!textura.has('quadro' + i)) {
            textura.add('quadro' + i, 0, quadro.x + 3, quadro.y + 3,
                quadro.largura - 6, quadro.altura - 6);
        }
    });
    cena.vendoHistoria = true;
    const fixo = (objeto, profundidade) => objeto.setScrollFactor(0).setDepth(profundidade);
    // Quadro, legenda e dica foram posicionados para 640 de altura; em telas
    // mais altas descem juntos para ficar no meio.
    const meio = (config.height - 640) / 2;
    // Fundo: a floresta do menu escurecida, como na loja. Arte e sombra passam da tela para
    // o tremor do quadro do roubo nao deixar aparecer o jogo por tras.
    const escalaArte = Math.max(config.width / 941, config.height / 1672) * 1.12;
    const arte = fixo(cena.add.image(180, config.height / 2, 'introducao', '__BASE').setScale(escalaArte), 40)
        .setAlpha(0);
    const fundo = fixo(cena.add.rectangle(180, config.height / 2, 360 + 80, config.height + 80, 0x1a0e08, 0.86), 40)
        .setAlpha(0);
    const pontos = fixo(cena.add.graphics(), 41);
    const toque = fixo(cena.add.zone(180, config.height / 2, 360, config.height), 41).setInteractive();
    const pular = fixo(criarBotaoMadeira(cena, 300, 26, 92, 34, 'PULAR »', () => encerrar(), { tamanho: 13 }), 42);
    const fundoLegenda = fixo(cena.add.graphics(), 41);
    const legenda = fixo(cena.add.text(180, 0, '', {
        resolution: 4, fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold',
        color: '#3b2418', align: 'center', wordWrap: { width: 288 }, lineSpacing: 4
    }), 42).setOrigin(0.5).setFixedSize(288, 0);
    const dica = fixo(cena.add.text(180, 604 + meio, 'Toque para continuar  ›', {
        resolution: 4, fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#fff4d6',
        stroke: '#1a0e08', strokeThickness: 4
    }), 41).setOrigin(0.5);
    const objetos = [arte, fundo, pontos, toque, pular, fundoLegenda, legenda, dica];
    cena.tweens.add({ targets: [arte, fundo], alpha: 1, duration: 250 });
    cena.tweens.add({
        targets: dica, alpha: 0.5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    let indice = -1;
    let grupo = null;
    let digitacao = null;
    let terminou = false;

    const desenharPontos = () => {
        pontos.clear();
        const inicioX = 166 - (quadrosHistoria.length - 1) * 8;
        quadrosHistoria.forEach((quadro, i) => {
            pontos.fillStyle(i === indice ? 0xffd24a : 0xffe1a6, i === indice ? 1 : 0.35)
                .fillCircle(inicioX + i * 16, 26, i === indice ? 5 : 3.5);
        });
    };
    const completarLegenda = () => {
        if (!digitacao) return;
        digitacao.remove();
        digitacao = null;
        legenda.setText(legenda.textoCompleto);
    };
    const escreverLegenda = (texto) => {
        // Quebra as linhas antes de digitar, para as palavras nao pularem de linha.
        const linhas = legenda.getWrappedText(texto).join('\n');
        legenda.textoCompleto = linhas;
        legenda.setText(linhas);
        const altura = legenda.height + 26;
        fundoLegenda.clear()
            .fillStyle(0xfff4d6, 1).fillRoundedRect(24, 452 + meio, 312, altura, 12)
            .lineStyle(3, 0x3b2418, 1).strokeRoundedRect(24, 452 + meio, 312, altura, 12);
        legenda.y = 452 + meio + altura / 2;
        legenda.setText('');
        // Conta pelo tempo, e nao por quadro, para digitar igual em qualquer aparelho.
        const inicio = cena.time.now;
        digitacao = cena.time.addEvent({
            delay: 16, loop: true,
            callback: () => {
                const letras = Math.min(linhas.length, Math.floor((cena.time.now - inicio) * 0.05));
                legenda.setText(linhas.slice(0, letras));
                if (letras >= linhas.length) completarLegenda();
            }
        });
    };
    const efeitoQuadro = (efeito) => {
        const depois = (atraso, acao) => cena.time.delayedCall(atraso, () => {
            if (!terminou) acao();
        });
        if (efeito === 'feliz') som.feliz();
        else if (efeito === 'suspense') som.suspense();
        else if (efeito === 'risada') som.risada();
        else if (efeito === 'final') som.nivel();
        else if (efeito === 'fuga') [0, 180, 360].forEach((atraso) => depois(atraso, () => som.guaxinimPulo()));
        else if (efeito === 'roubo') {
            depois(250, () => {
                som.quebra();
                som.risada();
                cena.cameras.main.shake(260, 0.012);
            });
        }
    };
    const mostrarQuadro = (novo) => {
        indice = novo;
        desenharPontos();
        som.virarPagina();
        if (grupo) {
            const antigo = grupo;
            cena.tweens.killTweensOf(antigo);
            cena.tweens.add({
                targets: antigo, x: -160, angle: -6, alpha: 0, duration: 300,
                ease: 'Quad.easeIn', onComplete: () => antigo.destroy()
            });
        }
        const frame = textura.get('quadro' + novo);
        const escala = Math.min(330 / frame.width, 330 / frame.height);
        const largura = frame.width * escala;
        const altura = frame.height * escala;
        // Moldura clara com sombra, como um quadrinho impresso.
        const moldura = cena.add.graphics()
            .fillStyle(0x000000, 0.35)
            .fillRoundedRect(-largura / 2 - 1, -altura / 2, largura + 12, altura + 12, 10)
            .fillStyle(0xfff4d6, 1)
            .fillRoundedRect(-largura / 2 - 6, -altura / 2 - 6, largura + 12, altura + 12, 10);
        const imagem = cena.add.image(0, 0, 'historia', 'quadro' + novo).setScale(escala);
        const atual = cena.add.container(520, 262 + meio, [moldura, imagem])
            .setScrollFactor(0).setDepth(41).setAngle(6).setAlpha(0);
        grupo = atual;
        cena.tweens.add({
            targets: atual, x: 180, angle: 0, alpha: 1, duration: 420, ease: 'Back.easeOut',
            onComplete: () => cena.tweens.add({
                targets: atual, scale: 1.025, duration: 2400,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            })
        });
        escreverLegenda(quadrosHistoria[novo].texto);
        if (novo === quadrosHistoria.length - 1) dica.setText(textoFinal);
        efeitoQuadro(quadrosHistoria[novo].efeito);
    };
    const encerrar = () => {
        if (terminou) return;
        terminou = true;
        completarLegenda();
        cena.input.keyboard.off('keydown', tecla);
        toque.disableInteractive();
        pular.disableInteractive();
        const todos = [...objetos, grupo].filter(Boolean);
        cena.tweens.killTweensOf(todos);
        cena.tweens.add({
            targets: todos, alpha: 0, duration: 260,
            onComplete: () => todos.forEach((objeto) => objeto.destroy())
        });
        // Libera o menu um instante depois, para a mesma tecla nao iniciar a partida.
        cena.time.delayedCall(60, () => {
            cena.vendoHistoria = false;
        });
        aoTerminar();
    };
    const avancar = () => {
        if (terminou) return;
        if (digitacao) {
            completarLegenda();
        } else if (indice < quadrosHistoria.length - 1) {
            mostrarQuadro(indice + 1);
        } else {
            encerrar();
        }
    };
    const tecla = (evento) => {
        if (evento.repeat) return;
        if (evento.code === 'Escape') encerrar();
        else if (['Space', 'Enter', 'ArrowRight'].includes(evento.code)) avancar();
    };
    toque.on('pointerdown', avancar);
    cena.input.keyboard.on('keydown', tecla);
    cena.events.once('shutdown', () => cena.input.keyboard.off('keydown', tecla));
    mostrarQuadro(0);
}

// A arte do tronco tem uma folga transparente no topo.
function topoTronco(plataforma) {
    return plataforma.y - plataforma.displayHeight / 2 + 7;
}

// O vilao: sobe os troncos logo acima do gato, carregando o saco roubado.
function criarGuaxinim(cena) {
    const figura = cena.add.image(0, 0, 'guaxinim').setOrigin(0.5, 0.98);
    const saco = cena.add.image(19, -20, 'fx_saco').setScale(0.5).setAngle(14);
    // Fica atras dos granulados para nao esconder o que o jogador vai pegar.
    const visual = cena.add.container(0, 0, [figura, saco]).setDepth(1.5);
    cena.guaxinim = {
        visual, figura, saco,
        escala: 62 / figura.width,
        expressao: null, expressaoAte: 0,
        plataforma: null, deslocX: 0, pulando: false, direcao: -1,
        deformacao: { x: 1, y: 1 }, tempo: 0,
        proximaProvocacao: 0, vistoEm: 0,
        // Relogio proprio (tempo, em segundos) para a pausa nao gastar a distracao.
        distraidoAte: 0, proximaDistracao: Phaser.Math.FloatBetween(7, 10),
        proximaGargalhada: 0, distracoes: 0, dica: null
    };
    const primeiro = cena.plataformas.getChildren().find((plataforma) => plataforma.numero === 1);
    if (primeiro) {
        cena.guaxinim.plataforma = primeiro;
        cena.guaxinim.deslocX = sortearLadoTronco(primeiro);
        visual.setPosition(primeiro.x + cena.guaxinim.deslocX, topoTronco(primeiro));
    }
    atualizarVisualGuaxinim(cena);
}

// Para perto de uma das pontas, deixando o meio do tronco livre para o granulado.
function sortearLadoTronco(plataforma) {
    const folga = Math.max(0, plataforma.displayWidth / 2 - 22);
    return folga * Phaser.Math.FloatBetween(0.5, 1) * (Math.random() < 0.5 ? -1 : 1);
}

function atualizarVisualGuaxinim(cena) {
    const guaxinim = cena.guaxinim;
    const distraido = guaxinim.tempo < guaxinim.distraidoAte && !guaxinim.pulando;
    // Rindo enquanto esta distraido ou provocando; assustado logo depois do susto.
    const expressao = distraido ? 'guaxinim_rindo'
        : guaxinim.tempo < guaxinim.expressaoAte ? guaxinim.expressao : 'guaxinim';
    if (guaxinim.figura.texture.key !== expressao) guaxinim.figura.setTexture(expressao);
    // Distraido, ele chacoalha de tanto rir.
    const respiro = guaxinim.pulando ? 0 : distraido
        ? Math.sin(guaxinim.tempo * 24) * 0.06 : Math.sin(guaxinim.tempo * 5) * 0.03;
    guaxinim.figura.setScale(
        guaxinim.escala * guaxinim.deformacao.x * (1 - respiro / 2),
        guaxinim.escala * guaxinim.deformacao.y * (1 + respiro));
    guaxinim.visual.angle = distraido ? Math.sin(guaxinim.tempo * 9) * 6 : 0;
    // A arte olha para a direita; o container espelha figura e saco juntos.
    guaxinim.visual.scaleX = guaxinim.direcao;
    if (guaxinim.dica) {
        guaxinim.dica.setPosition(guaxinim.visual.x, guaxinim.visual.y + 40 + Math.sin(guaxinim.tempo * 6) * 3);
    }
}

// O guaxinim nunca e pego: foge sempre um tronco a frente do gato. De vez em
// quando ele se distrai rindo; se o gato encostar nele nessa hora, ele se assusta,
// solta granulados do pacote e continua fugindo.
function atualizarGuaxinim(cena, delta) {
    const guaxinim = cena.guaxinim;
    const agora = cena.time.now;
    const camera = cena.cameras.main;
    guaxinim.tempo += delta / 1000;
    // Pes abaixo do placar e acima do fim da tela: o corpo inteiro aparece.
    const visivel = guaxinim.visual.y > camera.scrollY + 100 &&
        guaxinim.visual.y < camera.scrollY + config.height;
    if (visivel || guaxinim.pulando) guaxinim.vistoEm = agora;
    const distraido = guaxinim.tempo < guaxinim.distraidoAte;
    // A distracao acabou sem o gato encostar: ele percebe e volta a vigiar.
    if (guaxinim.distraidoAte && !distraido) {
        encerrarDistracao(guaxinim);
        if (!guaxinim.pulando) mostrarPopup(cena, guaxinim.visual.x, guaxinim.visual.y - 66, 'opa!', '#f2f2f2', 14);
    }
    if (!guaxinim.pulando) {
        const plataforma = guaxinim.plataforma;
        if (plataforma && plataforma.active) {
            guaxinim.visual.setPosition(plataforma.x + guaxinim.deslocX, topoTronco(plataforma));
        }
        // Fica de olho no gato enquanto espera; distraido, fica de costas para ele.
        const gatoAEsquerda = cena.caixa.x < guaxinim.visual.x;
        guaxinim.direcao = gatoAEsquerda !== distraido ? -1 : 1;
        const distancia = cena.caixa.body.bottom - guaxinim.visual.y;
        if (distraido && encostouNoGuaxinim(cena)) {
            assustarGuaxinim(cena);
        } else if (!plataforma || !plataforma.active || plataforma.numero <= cena.ultimoTronco ||
            (!distraido && distancia < 105)) {
            // No topo do pulo o gato passa ~113 px abaixo do segundo tronco acima;
            // fugir so abaixo disso mantem o guaxinim um tronco a frente, e nao dois.
            // Distraido, ele so percebe o gato quando ele pousa no tronco dele.
            if (distraido) encerrarDistracao(guaxinim);
            const alvo = escolherFugaGuaxinim(cena);
            if (alvo) pularGuaxinim(cena, alvo);
        } else if (agora - guaxinim.vistoEm > 1500) {
            // Se passou tempo demais fora da tela, volta para um tronco visivel a frente.
            if (distraido) encerrarDistracao(guaxinim);
            const alvo = escolherTroncoVisivel(cena);
            if (alvo && alvo !== plataforma) pularGuaxinim(cena, alvo);
        } else if (distraido) {
            if (guaxinim.tempo > guaxinim.proximaGargalhada) {
                guaxinim.proximaGargalhada = guaxinim.tempo + 1;
                mostrarPopup(cena, guaxinim.visual.x, guaxinim.visual.y - 66, 'HAHAHA!', '#f2f2f2', 14);
                som.risada();
            }
        } else if (visivel && distancia > 170 && cena.contador >= 2 &&
            guaxinim.tempo > guaxinim.proximaDistracao) {
            distrairGuaxinim(cena);
        } else if (visivel && distancia > 170 && agora > guaxinim.proximaProvocacao) {
            provocarGuaxinim(cena);
        }
    }
    atualizarVisualGuaxinim(cena);
}

// Ele ri tanto de costas para o gato que da tempo de chegar de fininho.
function distrairGuaxinim(cena) {
    const guaxinim = cena.guaxinim;
    // Dura cerca de um ciclo e meio de pulo, que encurta com a velocidade do jogo.
    guaxinim.distraidoAte = guaxinim.tempo + 3.2 / cena.velocidadeJogo;
    guaxinim.proximaGargalhada = guaxinim.tempo;
    guaxinim.distracoes += 1;
    // Nas duas primeiras vezes da partida, uma dica embaixo do tronco dele.
    if (guaxinim.distracoes <= 2) {
        guaxinim.dica = cena.add.text(guaxinim.visual.x, guaxinim.visual.y + 40, 'encoste nele!', {
            resolution: 4, fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold',
            color: '#ffd24a', stroke: '#2a160d', strokeThickness: 4
        }).setOrigin(0.5).setDepth(7);
    }
}

function encerrarDistracao(guaxinim) {
    guaxinim.distraidoAte = 0;
    guaxinim.proximaDistracao = guaxinim.tempo + Phaser.Math.FloatBetween(10, 16);
    if (guaxinim.dica) {
        guaxinim.dica.destroy();
        guaxinim.dica = null;
    }
}

// Compara o corpo do gato com o do guaxinim parado no tronco, com uma folga pequena.
function encostouNoGuaxinim(cena) {
    const corpo = cena.caixa.body;
    const guaxinim = cena.guaxinim;
    const x = guaxinim.visual.x;
    const pes = guaxinim.visual.y;
    return corpo.right > x - 26 && corpo.left < x + 26 &&
        corpo.bottom > pes - 52 && corpo.top < pes + 4;
}

function assustarGuaxinim(cena) {
    const guaxinim = cena.guaxinim;
    registrarMissao(cena, 'sustos', 1);
    encerrarDistracao(guaxinim);
    const x = guaxinim.visual.x;
    const y = guaxinim.visual.y;
    mostrarPopup(cena, x, y - 66, 'EI!', '#ffffff', 18);
    guaxinim.expressao = 'guaxinim_susto';
    guaxinim.expressaoAte = guaxinim.tempo + 1.1;
    mostrarPopup(cena, cena.caixa.x, cena.caixa.y - 56, '+' + granuladosSusto, '#ffd24a', 20);
    som.susto();
    cena.cameras.main.shake(120, 0.004);
    // O pacote chacoalha e deixa escapar granulados, que voam ate o gato.
    const pacoteX = x + guaxinim.direcao * 19;
    const pacoteY = y - 20;
    cena.efeitos.brilho.explode(10, pacoteX, pacoteY);
    for (let i = 0; i < granuladosSusto; i++) soltarGranuladoDoPacote(cena, pacoteX, pacoteY, i);
    const alvo = escolherFugaGuaxinim(cena);
    if (alvo) pularGuaxinim(cena, alvo);
}

function soltarGranuladoDoPacote(cena, x, y, indice) {
    const granulado = cena.add.image(x, y, 'moeda').setScale(26 / larguraGranulado).setDepth(6);
    // Abre em leque para cima e depois cada um voa ate o gato.
    const angulo = Phaser.Math.DegToRad(-90 + (indice - (granuladosSusto - 1) / 2) * 30 +
        Phaser.Math.FloatBetween(-8, 8));
    const alcance = Phaser.Math.FloatBetween(45, 70);
    cena.tweens.add({
        targets: granulado,
        x: x + Math.cos(angulo) * alcance, y: y + Math.sin(angulo) * alcance,
        angle: Phaser.Math.Between(-180, 180), duration: 280, ease: 'Quad.easeOut',
        onComplete: () => {
            const inicioX = granulado.x;
            const inicioY = granulado.y;
            cena.tweens.addCounter({
                from: 0, to: 1, delay: indice * 80, duration: 300, ease: 'Quad.easeIn',
                onUpdate: (contagem) => {
                    const t = contagem.getValue();
                    granulado.setPosition(Phaser.Math.Linear(inicioX, cena.caixa.x, t),
                        Phaser.Math.Linear(inicioY, cena.caixa.y, t));
                },
                onComplete: () => {
                    granulado.destroy();
                    if (cena.morreu) return;
                    somarGranulado(cena);
                    som.granulado(indice * 2);
                    cena.efeitos.brilho.explode(4, cena.caixa.x, cena.caixa.y);
                }
            });
        }
    });
}

// O tronco a frente do gato mais proximo dele que aparece inteiro na tela.
function escolherTroncoVisivel(cena) {
    const camera = cena.cameras.main;
    const pes = cena.caixa.body.bottom;
    let alvo = null;
    for (const plataforma of cena.plataformas.getChildren()) {
        const topo = topoTronco(plataforma);
        if (!plataforma.active || plataforma.numero <= cena.ultimoTronco ||
            topo < camera.scrollY + 110 || topo > pes - 105) continue;
        if (!alvo || plataforma.numero < alvo.numero) alvo = plataforma;
    }
    return alvo;
}

// O proximo tronco que fica pelo menos 150 px acima dos pes do gato.
function escolherFugaGuaxinim(cena) {
    const guaxinim = cena.guaxinim;
    const pes = cena.caixa.body.bottom;
    const minimo = Math.max(guaxinim.plataforma ? guaxinim.plataforma.numero : 0, cena.ultimoTronco);
    let alvo = null;
    for (const plataforma of cena.plataformas.getChildren()) {
        if (!plataforma.active || plataforma.numero <= minimo || topoTronco(plataforma) > pes - 150) continue;
        if (!alvo || plataforma.numero < alvo.numero) alvo = plataforma;
    }
    return alvo;
}

function pularGuaxinim(cena, alvo) {
    const guaxinim = cena.guaxinim;
    const camera = cena.cameras.main;
    const inicioX = guaxinim.visual.x;
    // Se ficou longe da tela, reaparece saltando da borda mais proxima.
    const inicioY = Phaser.Math.Clamp(guaxinim.visual.y,
        camera.scrollY - 40, camera.scrollY + config.height + 40);
    const visivel = inicioY < camera.scrollY + config.height && inicioY > camera.scrollY;
    guaxinim.pulando = true;
    guaxinim.plataforma = alvo;
    guaxinim.deslocX = sortearLadoTronco(alvo);
    guaxinim.direcao = alvo.x + guaxinim.deslocX >= inicioX ? 1 : -1;
    if (visivel) som.guaxinimPulo();
    const deformacao = guaxinim.deformacao;
    cena.tweens.killTweensOf(deformacao);
    deformacao.x = 0.85;
    deformacao.y = 1.18;
    cena.tweens.add({ targets: deformacao, x: 1, y: 1, duration: 300, ease: 'Sine.easeOut' });
    const progresso = { t: 0 };
    let proximoGranulo = 0;
    cena.tweens.add({
        targets: progresso, t: 1, duration: 520 / cena.velocidadeJogo,
        onUpdate: () => {
            const t = progresso.t;
            guaxinim.visual.x = Phaser.Math.Linear(inicioX, alvo.x + guaxinim.deslocX, t);
            guaxinim.visual.y = Phaser.Math.Linear(inicioY, topoTronco(alvo), t) - 70 * 4 * t * (1 - t);
            // O saco vai deixando cair granulados pelo caminho.
            if (t >= proximoGranulo) {
                proximoGranulo += 0.3;
                cena.efeitos.granulos.explode(1,
                    guaxinim.visual.x + guaxinim.direcao * 18, guaxinim.visual.y - 20);
            }
        },
        onComplete: () => {
            guaxinim.pulando = false;
            cena.efeitos.poeira.explode(4, guaxinim.visual.x, guaxinim.visual.y);
            soltarGranuladosDoCaminho(cena, alvo.numero);
            deformacao.x = 1.22;
            deformacao.y = 0.8;
            cena.tweens.add({
                targets: deformacao, x: 1, y: 1, duration: 380,
                ease: 'Elastic.easeOut', easeParams: [1, 0.45]
            });
        }
    });
}

function provocarGuaxinim(cena) {
    const guaxinim = cena.guaxinim;
    guaxinim.proximaProvocacao = cena.time.now + Phaser.Math.Between(3500, 6500);
    if (guaxinim.pulando) return;
    mostrarPopup(cena, guaxinim.visual.x, guaxinim.visual.y - 66, 'hehe!', '#f2f2f2', 14);
    som.risada();
    guaxinim.expressao = 'guaxinim_rindo';
    guaxinim.expressaoAte = guaxinim.tempo + 0.9;
    cena.tweens.killTweensOf(guaxinim.deformacao);
    guaxinim.deformacao.x = 0.9;
    guaxinim.deformacao.y = 1.12;
    cena.tweens.add({
        targets: guaxinim.deformacao, x: 1, y: 1, duration: 500,
        ease: 'Elastic.easeOut', easeParams: [1, 0.4]
    });
}

function mostrarMorte(cena) {
    if (cena.morreu) return;
    cena.morreu = true;
    cena.physics.pause();
    musica.parar(0.04);
    som.morte();
    cena.cameras.main.shake(240, 0.006);

    // Quem trapaceou fica sem nada: nem recorde, nem granulados no cofrinho.
    const trapaceou = Boolean(cena.trapaca);
    if (trapaceou) {
        cena.totalMoedas = 0;
        cena.contador = 0;
    }
    const anterior = cena.recorde;
    const jaTinhaRecorde = anterior.granulados > 0 || anterior.altura > 0;
    const novoRecorde = !trapaceou && jaTinhaRecorde &&
        (cena.totalMoedas > anterior.granulados || cena.alturaMax > anterior.altura);
    if (!trapaceou) {
        cena.recorde = {
            granulados: Math.max(anterior.granulados, cena.totalMoedas),
            troncos: Math.max(anterior.troncos, cena.contador),
            altura: Math.max(anterior.altura, cena.alturaMax)
        };
        salvarRecorde(cena.recorde);
    }
    // Os granulados da partida vao para o cofrinho da loja.
    const loja = lerLoja();
    loja.saldo += cena.totalMoedas;
    salvarLoja(loja);
    cena.loja = loja;

    const estilo = (tamanho, cor, extra = {}) => ({
        resolution: 4, fontFamily: 'Arial', fontSize: tamanho + 'px', color: cor,
        align: 'center', ...extra
    });
    const sombra = cena.add.rectangle(180, config.height / 2, 360, config.height, 0x160d08, 0.82)
        .setScrollFactor(0).setDepth(30).setAlpha(0);
    const fundo = cena.add.graphics()
        .fillStyle(0x3b2418, 1).fillRoundedRect(-150, -200, 300, 400, 20)
        .lineStyle(3, 0xffe1a6, 0.9).strokeRoundedRect(-150, -200, 300, 400, 20);
    const titulo = cena.add.text(0, -162, 'Você perdeu',
        estilo(30, corTexto, { fontStyle: 'bold' })).setOrigin(0.5);
    const icone = cena.add.image(0, -104, 'moeda').setScale(40 / larguraGranulado);
    const pontos = cena.add.text(0, -104, '0',
        estilo(36, '#ffffff', { fontStyle: 'bold' })).setOrigin(0, 0.5);
    const centralizarPontos = () => {
        const largura = 40 + 10 + pontos.width;
        icone.x = -largura / 2 + 20;
        pontos.x = icone.x + 30;
    };
    centralizarPontos();
    const troncos = cena.add.text(0, -60, 'Troncos: ' + cena.contador,
        estilo(17, '#f4ddc9')).setOrigin(0.5);
    const recorde = cena.add.text(0, -32, trapaceou ? 'O guaxinim levou tudo. Recorde: 0'
        : `Recorde: ${contar(cena.recorde.granulados, 'granulado')} · ${contar(cena.recorde.troncos, 'tronco')}`,
        estilo(13, trapaceou ? '#ff8a6a' : '#c9a98a', trapaceou ? { fontStyle: 'bold' } : {})).setOrigin(0.5);
    const cofrinho = cena.add.text(0, -8, `Cofrinho: ${contar(loja.saldo, 'granulado')}`,
        estilo(13, '#ffd24a', { fontStyle: 'bold' })).setOrigin(0.5);
    let reiniciando = false;
    let lojaAberta = false;
    const jogarDeNovo = () => {
        if (reiniciando || lojaAberta) return;
        reiniciando = true;
        som.iniciar();
        limparEventos();
        cena.scene.restart({ reiniciar: true });
    };
    const convite = criarBotaoMadeira(cena, 0, 44, 240, 52, 'JOGAR DE NOVO', jogarDeNovo, { tamanho: 19 });
    // A imagem do resultado fica pronta antes do toque: no iPhone o compartilhamento
    // precisa sair direto do toque, sem esperar a imagem ser gerada.
    let cartao = null;
    cena.time.delayedCall(300, () => {
        gerarCartaoResultado(cena).then((arquivo) => { cartao = arquivo; }).catch(() => {});
    });
    const avisoCompartilhar = cena.add.text(0, 186, '', estilo(12, '#ffd24a', { fontStyle: 'bold' })).setOrigin(0.5);
    const botaoCompartilhar = criarBotaoMadeira(cena, 0, 100, 240, 42, 'COMPARTILHAR', () => {
        if (reiniciando || lojaAberta) return;
        compartilharResultado(cena, cartao).then((resultado) => {
            const textos = { copiado: 'Link copiado! Cole onde quiser.', falhou: 'Não deu para compartilhar aqui.' };
            if (textos[resultado]) avisoCompartilhar.setText(textos[resultado]);
        });
    }, { tamanho: 15, cor: 0xb8e0a8 });
    const botaoLoja = criarBotaoMadeira(cena, -62, 154, 116, 44, 'LOJA', () => {
        if (reiniciando || lojaAberta) return;
        lojaAberta = true;
        mostrarLoja(cena, () => {
            lojaAberta = false;
        }, 40);
    }, { tamanho: 15, cor: 0xd9c2a8 });
    const botaoMenu = criarBotaoMadeira(cena, 62, 154, 116, 44, 'MENU', () => {
        if (reiniciando || lojaAberta) return;
        reiniciando = true;
        limparEventos();
        voltarAoMenu(cena);
    }, { tamanho: 15, cor: 0xd9c2a8 });
    // Os botoes so respondem depois que o painel aparece, para nao tocar sem querer ao cair.
    const botoesMorte = [convite, botaoCompartilhar, botaoLoja, botaoMenu];
    botoesMorte.forEach((botao) => botao.disableInteractive());
    const painel = cena.add.container(180, config.height / 2,
        [fundo, titulo, icone, pontos, troncos, recorde, cofrinho, ...botoesMorte, avisoCompartilhar])
        .setScrollFactor(0).setDepth(31).setScale(0.6).setAlpha(0);

    cena.tweens.add({ targets: sombra, alpha: 1, duration: 260 });
    cena.tweens.add({
        targets: painel, scale: 1, alpha: 1, delay: 150, duration: 380, ease: 'Back.easeOut'
    });
    // Conta os granulados subindo ate o total da partida.
    if (cena.totalMoedas > 0) {
        cena.tweens.addCounter({
            from: 0, to: cena.totalMoedas, delay: 400,
            duration: Math.min(900, 250 + cena.totalMoedas * 40),
            onUpdate: (contagem) => {
                pontos.setText(String(Math.round(contagem.getValue())));
                centralizarPontos();
            }
        });
    }
    // O botao principal pulsa de leve para chamar a atencao.
    cena.tweens.add({
        targets: convite.rotulo, scale: 1.06, delay: 900, duration: 650,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    if (trapaceou) {
        const selo = cena.add.text(0, -202, 'TRAPAÇA DETECTADA', estilo(16, '#ffffff', {
            fontStyle: 'bold', backgroundColor: '#d9452f', padding: { x: 12, y: 6 }
        })).setOrigin(0.5).setAngle(-6);
        painel.add(selo);
        cena.time.delayedCall(500, () => som.buzina());
        cena.tweens.add({ targets: selo, angle: 6, duration: 180, yoyo: true, repeat: 5, delay: 400 });
    }
    if (novoRecorde) {
        const selo = cena.add.text(0, -202, 'NOVO RECORDE!', estilo(16, '#3b2418', {
            fontStyle: 'bold', backgroundColor: '#ffd24a', padding: { x: 12, y: 6 }
        })).setOrigin(0.5).setAngle(-5);
        painel.add(selo);
        cena.time.delayedCall(500, () => som.recorde());
        cena.tweens.add({
            targets: selo, scale: 1.08, duration: 550,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    function limparEventos() {
        cena.input.keyboard.off('keydown-SPACE', teclaReiniciar);
        cena.input.keyboard.off('keydown-ENTER', teclaReiniciar);
    }
    function teclaReiniciar(evento) {
        if (!evento.repeat) jogarDeNovo();
    }
    // Espera o painel aparecer, evitando reiniciar sem querer ao soltar o controle da queda.
    cena.time.delayedCall(450, () => {
        botoesMorte.forEach((botao) => botao.setInteractive({ useHandCursor: true }));
        cena.input.keyboard.on('keydown-SPACE', teclaReiniciar);
        cena.input.keyboard.on('keydown-ENTER', teclaReiniciar);
    });
    cena.events.once('shutdown', limparEventos);
}

function criarPlataforma(cena, x, y, largura, chao = false) {
    const numero = chao ? 0 : ++cena.totalTroncos;
    // Troncos especiais aparecem de tempos em tempos e nunca sao rachados.
    let especial = null;
    if (!chao && numero >= cena.proximaMola) {
        especial = 'mola';
        cena.proximaMola = numero + Phaser.Math.Between(12, 20);
    } else if (!chao && numero >= cena.proximoBalanco) {
        especial = 'balanco';
        cena.proximoBalanco = numero + Phaser.Math.Between(14, 22);
    }
    // O chao e os primeiros 20 troncos sao resistentes.
    const fragil = !especial && numero > 20 && Phaser.Math.Between(1, 10) <= 8;
    const textura = fragil ? 'troncoRachado' : 'troncoLiso';
    // Troncos mais grossos deixam as rachaduras mais visiveis.
    const altura = chao ? 16 : 32;
    // A grama do fundo representa o chao; o retangulo invisivel sustenta o gato.
    const plataforma = chao
        ? cena.add.rectangle(x, y, largura, altura, 0x000000, 0)
        : cena.add.image(x, y, textura).setDisplaySize(largura, altura);
    plataforma.fragil = fragil;
    plataforma.numero = numero;
    plataforma.contada = false;
    plataforma.larguraOriginal = largura;
    cena.plataformas.add(plataforma);
    plataforma.body.updateFromGameObject();
    ajustarLarguraTronco(cena, plataforma);
    // Uma a cada tres plataformas se move; as duas primeiras ficam paradas.
    // No espaco, duas a cada tres se movem, e mais longe.
    const noEspaco = cena.ceu && cena.ceu.fase >= faseEspaco;
    const amplitude = noEspaco ? 55 : 40;
    if (especial === 'balanco') {
        montarBalanco(cena, plataforma);
    } else if (!chao && (numero % 3 === 0 || (noEspaco && numero % 3 === 1))) {
        const margemMovimento = plataforma.displayWidth / 2 + 12 + amplitude;
        plataforma.x = Phaser.Math.Clamp(plataforma.x, margemMovimento,
            config.width - margemMovimento);
        plataforma.body.updateFromGameObject();
        plataforma.movimento = {
            centro: plataforma.x,
            fase: 0,
            sentido: numero % 2 === 0 ? 1 : -1,
            amplitude,
            velocidade: 1.2
        };
    }
    if (especial === 'mola') montarMola(cena, plataforma);
    plataforma.body.checkCollision.down = false;
    plataforma.body.checkCollision.left = false;
    plataforma.body.checkCollision.right = false;
    if (chao) return;
    // Especial raro: intervalo aleatorio de 18 a 30 plataformas entre dourados.
    const dourada = numero >= cena.proximoGranuladoDourado;
    if (dourada) cena.proximoGranuladoDourado = numero + Phaser.Math.Between(18, 30);
    if (ativarPoderes && !dourada && numero >= cena.proximoPoder) {
        cena.proximoPoder = numero + Phaser.Math.Between(22, 34);
        criarItemPoder(cena, plataforma);
    } else if (dourada || cena.poderes.pacote || Phaser.Math.Between(1, 100) <= 40) {
        // Com o pacote furado, todo tronco novo ganha granulado.
        criarMoeda(cena, plataforma, dourada);
    }
}

// Pendurado por duas cordas num galho com folhas: vai e volta num arco curto, sempre na horizontal.
function montarBalanco(cena, plataforma) {
    const margem = plataforma.displayWidth / 2 + 12 + 34;
    plataforma.x = Phaser.Math.Clamp(plataforma.x, margem, config.width - margem);
    plataforma.movimento = {
        tipo: 'balanco', centro: plataforma.x, yBase: plataforma.y, comprimento: 118,
        fase: Phaser.Math.FloatBetween(0, Math.PI * 2), sentido: 1, amplitude: 34, velocidade: 2.1, acompanharY: true
    };
    plataforma.cordas = cena.add.graphics().setDepth(-0.5);
    // O galho fica por cima das pontas das cordas.
    const folhagem = cena.add.image(plataforma.x, plataforma.y - 118, 'esp_galho').setOrigin(0.5, 0.62).setDepth(-0.4);
    folhagem.setScale((plataforma.displayWidth * 0.68 + 70) / folhagem.width);
    plataforma.folhagem = folhagem;
    plataforma.body.updateFromGameObject();
    plataforma.once('destroy', () => [plataforma.cordas, plataforma.folhagem].forEach((objeto) => objeto.destroy()));
    atualizarBalanco(plataforma, 0);
}

// Duas cordas trancadas, como as da placa do menu, das pontas do tronco ate o galhinho.
function desenharCordas(plataforma) {
    const movimento = plataforma.movimento;
    const g = plataforma.cordas;
    const afastamento = plataforma.displayWidth * 0.34;
    const topo = movimento.yBase - movimento.comprimento + 2;
    g.clear();
    [-1, 1].forEach((lado) => {
        const baixoX = plataforma.x + lado * afastamento;
        const baixoY = plataforma.y - 6;
        const cimaX = movimento.centro + lado * afastamento;
        g.lineStyle(5.5, 0x4d2710, 1).lineBetween(baixoX, baixoY, cimaX, topo);
        g.lineStyle(3, 0xd9b27a, 1).lineBetween(baixoX, baixoY, cimaX, topo);
        // Marcas da tranca ao longo da corda.
        const passos = Math.floor(Math.hypot(cimaX - baixoX, topo - baixoY) / 7);
        g.lineStyle(1.3, 0x8a5a35, 1);
        for (let i = 1; i < passos; i++) {
            const t = i / passos;
            const x = Phaser.Math.Linear(baixoX, cimaX, t);
            const y = Phaser.Math.Linear(baixoY, topo, t);
            g.lineBetween(x - 1.5, y + 1.5, x + 1.5, y - 1.5);
        }
        g.fillStyle(0x4d2710, 1).fillCircle(baixoX, baixoY, 4).fillStyle(0xd9b27a, 1).fillCircle(baixoX, baixoY, 2.5);
    });
}

function atualizarBalanco(plataforma, delta) {
    const movimento = plataforma.movimento;
    movimento.fase += delta / 1000 * plataforma.scene.velocidadeJogo * movimento.velocidade;
    const angulo = Math.asin(movimento.amplitude / movimento.comprimento) * Math.sin(movimento.fase);
    plataforma.x = movimento.centro + Math.sin(angulo) * movimento.comprimento;
    plataforma.y = movimento.yBase - movimento.comprimento * (1 - Math.cos(angulo));
    plataforma.body.updateFromGameObject();
    desenharCordas(plataforma);
}

// O gato pousou: as cordas dao um tranco para baixo.
function reagirBalanco(cena, plataforma) {
    const movimento = plataforma.movimento;
    cena.tweens.add({ targets: movimento, yBase: movimento.yBase + 9, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
}

function criarMoeda(cena, plataforma, dourada = false) {
    const moeda = cena.add.image(plataforma.x, plataforma.y - 60, dourada ? 'moedaDourada' : 'moeda')
        .setScale(38 / larguraGranulado).setDepth(2);
    moeda.dourada = dourada;
    moeda.plataforma = plataforma;
    plataforma.temItem = true;
    moeda.yBase = moeda.y;
    moeda.fase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    if (dourada) {
        moeda.brilho = cena.add.graphics().setDepth(1);
        moeda.once('destroy', () => moeda.brilho.destroy());
        atualizarBrilhoGranulado(moeda, 0);
    }
    cena.moedas.add(moeda);
    moeda.body.updateFromGameObject();
    // O granulado so aparece quando o guaxinim passa pelo tronco e ele cai do pacote.
    const guaxinim = cena.guaxinim;
    const troncoGuaxinim = guaxinim && guaxinim.plataforma ? guaxinim.plataforma.numero : 1;
    if (plataforma.numero > troncoGuaxinim) {
        moeda.escondida = true;
        moeda.setVisible(false);
        moeda.body.enable = false;
        if (moeda.brilho) moeda.brilho.setVisible(false);
    }
}

// Solta do pacote os granulados escondidos ate o tronco onde o guaxinim pousou.
function soltarGranuladosDoCaminho(cena, ateNumero) {
    const guaxinim = cena.guaxinim;
    const pacoteX = guaxinim.visual.x + guaxinim.direcao * 19;
    const pacoteY = guaxinim.visual.y - 20;
    for (const moeda of cena.moedas.getChildren()) {
        if (!moeda.escondida || moeda.plataforma.numero > ateNumero) continue;
        moeda.escondida = false;
        const revelar = () => {
            if (!moeda.active) return;
            moeda.setVisible(true);
            moeda.body.enable = true;
            if (moeda.brilho) moeda.brilho.setVisible(true);
            const escala = moeda.scaleX;
            moeda.setScale(escala * 0.4);
            cena.tweens.add({ targets: moeda, scale: escala, duration: 260, ease: 'Back.easeOut' });
        };
        // Troncos pulados longe do guaxinim so ganham o granulado no lugar.
        if (moeda.plataforma !== guaxinim.plataforma) {
            revelar();
            continue;
        }
        // O granulado salta do pacote ate o meio do tronco.
        const voando = cena.add.image(pacoteX, pacoteY, moeda.texture.key).setScale(moeda.scaleX * 0.6).setDepth(2);
        cena.tweens.addCounter({
            from: 0, to: 1, duration: 360,
            onUpdate: (contagem) => {
                const t = contagem.getValue();
                voando.setPosition(Phaser.Math.Linear(pacoteX, moeda.x, t),
                    Phaser.Math.Linear(pacoteY, moeda.y, t) - 40 * 4 * t * (1 - t))
                    .setAngle(t * 360);
            },
            onComplete: () => {
                voando.destroy();
                revelar();
            }
        });
    }
}

function atualizarBrilhoGranulado(moeda, tempo) {
    const pulso = (Math.sin(tempo * 5 + moeda.fase) + 1) / 2;
    const brilho = moeda.brilho;
    brilho.clear();
    brilho.fillStyle(0xffc629, 0.10 + pulso * 0.10).fillCircle(moeda.x, moeda.y, 29 + pulso * 5);
    brilho.fillStyle(0xffe78a, 0.16 + pulso * 0.12).fillCircle(moeda.x, moeda.y, 21);
    brilho.lineStyle(2, 0xfff4b0, 0.65 + pulso * 0.35);
    for (let i = 0; i < 3; i++) {
        const angulo = tempo * 1.4 + moeda.fase + i * Math.PI * 2 / 3;
        const x = moeda.x + Math.cos(angulo) * 25;
        const y = moeda.y + Math.sin(angulo) * 25;
        brilho.lineBetween(x - 3, y, x + 3, y);
        brilho.lineBetween(x, y - 3, x, y + 3);
    }
}

function atualizarMoedas(cena, delta) {
    cena.tempoMoedas += delta;
    // Percorre de tras para frente para remover sem copiar a lista a cada quadro.
    const moedas = cena.moedas.getChildren();
    const tempo = cena.tempoMoedas / 1000;
    for (let i = moedas.length - 1; i >= 0; i--) {
        const moeda = moedas[i];
        if (moeda.yBase > cena.cameras.main.scrollY + config.height + 60) {
            moeda.destroy();
            continue;
        }
        if (moeda.atraida) {
            // O ima puxa o granulado ate o gato, cada vez mais rapido.
            const corpo = cena.caixa.body;
            moeda.velocidadeIma = Math.min(900, (moeda.velocidadeIma || 180) + delta * 1.4);
            const passo = moeda.velocidadeIma * delta / 1000;
            const dx = corpo.center.x - moeda.x;
            const dy = corpo.center.y - moeda.y;
            const distancia = Math.hypot(dx, dy) || 1;
            moeda.x += dx / distancia * Math.min(passo, distancia);
            moeda.y += dy / distancia * Math.min(passo, distancia);
            moeda.yBase = moeda.y;
            moeda.angle += delta * 0.6;
            if (moeda.dourada) atualizarBrilhoGranulado(moeda, tempo);
            moeda.body.updateFromGameObject();
            continue;
        }
        if (moeda.plataforma.active) {
            moeda.x = moeda.plataforma.x;
            // O balanco sobe um pouco nas pontas do arco; o granulado vai junto.
            if (moeda.plataforma.movimento && moeda.plataforma.movimento.acompanharY) {
                moeda.yBase = moeda.plataforma.y - 60;
            }
        }
        moeda.y = moeda.yBase + Math.sin(tempo * 3 + moeda.fase) * 5;
        moeda.angle = Math.sin(tempo * 6 + moeda.fase) * 12;
        if (moeda.dourada) atualizarBrilhoGranulado(moeda, tempo);
        // Mantem a area de coleta junto da moeda enquanto ela flutua.
        moeda.body.updateFromGameObject();
    }
}

function atualizarPlataformasMoveis(cena, delta) {
    for (const plataforma of cena.plataformas.getChildren()) {
        // A mola acompanha o tronco que se mexe e encolhe sob os pes do gato.
        if (plataforma.mola) {
            plataforma.mola.x = plataforma.x;
            apertarMola(cena, plataforma);
        }
        const movimento = plataforma.movimento;
        if (!movimento) continue;
        if (movimento.tipo === 'balanco') {
            atualizarBalanco(plataforma, delta);
            continue;
        }
        movimento.fase += delta / 1000 * movimento.velocidade * cena.velocidadeJogo;
        const margem = plataforma.displayWidth / 2 + 12;
        const amplitude = Math.max(0, Math.min(movimento.amplitude,
            movimento.centro - margem, config.width - margem - movimento.centro));
        plataforma.x = movimento.centro + Math.sin(movimento.fase) * amplitude * movimento.sentido;
        // O corpo estatico acompanha a imagem para manter o salto no lugar certo.
        plataforma.body.updateFromGameObject();
    }
}

function coletarMoeda(caixa, moeda) {
    const cena = caixa.scene;
    if (!cena.iniciado || cena.morreu || !moeda.active || moeda.coletada) return;
    moeda.coletada = true;
    moeda.body.enable = false;
    const vale = contarCombo(cena);
    somarGranulado(cena, vale);
    cena.efeitos.brilho.explode(moeda.dourada ? 22 : 8, moeda.x, moeda.y);
    if (moeda.dourada) {
        registrarMissao(cena, 'dourados', 1);
        aplicarImpulsoDourado(caixa);
        mostrarPopup(cena, moeda.x, moeda.y - 14, 'SUPER PULO!', '#ffd24a', 18);
    } else {
        som.granulado(cena.combo.seguidos);
        mostrarPopup(cena, moeda.x, moeda.y - 10, '+' + vale,
            vale === 3 ? '#ffd24a' : vale === 2 ? '#ffb36b' : corTexto, 16 + (vale - 1) * 3);
    }
    voarParaPlacar(cena, moeda.x, moeda.y, moeda.texture.key, moeda.scaleX);
    moeda.destroy();
}

function somarGranulado(cena, valor = 1) {
    cena.totalMoedas += valor;
    cena.vigia.moedas += valor;
    cena.granuladosPegos += valor;
    registrarMissao(cena, 'granulados', cena.granuladosPegos);
    atualizarHud(cena);
    pulsarHud(cena, cena.hud.granulados);
}

// Mais um granulado na sequencia; devolve quanto ele vale (x1, x2 ou x3).
function contarCombo(cena) {
    const combo = cena.combo;
    combo.seguidos += 1;
    if (combo.seguidos === 3) pedirDica(cena, 'combo');
    registrarMissao(cena, 'seguidos', combo.seguidos);
    const nivel = niveisCombo.find((item) => combo.seguidos >= item.seguidos);
    const vale = nivel ? nivel.vale : 1;
    if (vale > combo.vale) {
        const caixa = cena.caixa;
        mostrarPopup(cena, caixa.x, caixa.y - 70, `COMBO x${vale}!`, vale === 3 ? '#ffd24a' : '#ffb36b', 22);
        cena.efeitos.brilho.explode(14, caixa.x, caixa.y - 20);
        som.combo(vale);
    }
    combo.vale = vale;
    atualizarCombo(cena, true);
    return vale;
}

// Um granulado ficou para tras (ou veio uma bicada): a sequencia recomeca.
function quebrarCombo(cena) {
    const combo = cena.combo;
    if (combo.seguidos === 0) return;
    if (combo.vale > 1) {
        mostrarPopup(cena, cena.caixa.x, cena.caixa.y - 70, 'combo perdido', '#f4ddc9', 14);
        som.comboPerdido();
    }
    combo.seguidos = 0;
    combo.vale = 1;
    atualizarCombo(cena, false);
}

// Etiqueta embaixo da placa de granulados: a sequencia atual e quanto cada um vale.
function atualizarCombo(cena, pulsar) {
    const hud = cena.hud;
    if (!hud) return;
    const combo = cena.combo;
    const etiqueta = hud.combo;
    cena.tweens.killTweensOf(etiqueta);
    if (combo.seguidos < 2) {
        if (etiqueta.visible) {
            cena.tweens.add({
                targets: etiqueta, alpha: 0, x: { from: 174, to: 180 }, duration: 260,
                ease: 'Sine.easeInOut', onComplete: () => etiqueta.setVisible(false)
            });
        }
        return;
    }
    const falta = niveisCombo.slice().reverse().find((item) => combo.seguidos < item.seguidos);
    hud.textoCombo.setText(combo.vale > 1
        ? `COMBO x${combo.vale} · ${combo.seguidos}` : `${combo.seguidos} seguidos`)
        .setColor(combo.vale === 3 ? '#ffd24a' : combo.vale === 2 ? '#ffb36b' : '#fff4d6');
    // Barrinha ate o proximo nivel do combo.
    const barra = hud.barraCombo;
    const anterior = niveisCombo.slice().reverse().filter((item) => combo.seguidos >= item.seguidos).pop();
    const inicio = anterior ? anterior.seguidos : 0;
    const progresso = falta ? (combo.seguidos - inicio) / (falta.seguidos - inicio) : 1;
    barra.clear().fillStyle(0x1a0e08, 0.6).fillRoundedRect(-40, 8, 80, 4, 2);
    barra.fillStyle(combo.vale === 1 ? 0xffb36b : 0xffd24a, 1).fillRoundedRect(-40, 8, 80 * progresso, 4, 2);
    etiqueta.setVisible(true).setAlpha(1).setX(180);
    if (pulsar) {
        etiqueta.setScale(1.2);
        cena.tweens.add({ targets: etiqueta, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
}

// O antigo atalho de teste (Shift + B) virou isca: o super pulo funciona por um instante, mas entrega
// o trapaceiro para o guaxinim.
function configurarComandoSecreto(cena) {
    if (!cena.sys.game.device.os.desktop) return;
    const superImpulso = (evento) => {
        if (!evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey || evento.repeat) return;
        if (!cena.iniciado || cena.morreu || cena.iniciando || cena.pausado || cena.pegandoTrapaceiro) return;
        if (cena.trapaca && cena.trapaca.pego) return;
        aplicarImpulsoDourado(cena.caixa, 1200);
        detectarTrapaca(cena, 'atalho');
    };
    cena.input.keyboard.on('keydown-B', superImpulso);
    cena.events.once('shutdown', () => {
        cena.input.keyboard.off('keydown-B', superImpulso);
    });
}

function aplicarImpulsoDourado(caixa, forca = 640) {
    const cena = caixa.scene;
    // O dourado usa 640; o comando secreto usa um impulso mais forte.
    caixa.quedaSemVolta = false;
    caixa.poseContatoAte = 0;
    caixa.setTexture(texturaPose(cena, 'pulando')).setDisplaySize(78, 80);
    caixa.body.setVelocityY(Math.min(caixa.body.velocity.y, -forca * cena.velocidadeJogo));
    // Deixa um rastro dourado enquanto o impulso dura.
    caixa.turboAte = cena.time.now + 700;
    deformarGato(cena, 0.75, 1.3, 520);
    cena.cameras.main.shake(160, 0.005);
    som.dourado();
    const onda = cena.add.circle(caixa.x, caixa.y + 32, 16, 0xffda45, 0.2)
        .setStrokeStyle(3, 0xffec99).setDepth(3);
    cena.tweens.add({
        targets: onda, scaleX: 3, scaleY: 1.3, alpha: 0,
        duration: 350, ease: 'Quad.easeOut', onComplete: () => onda.destroy()
    });
}

// Mola em cima do tronco, mais estreita que ele.
function montarMola(cena, plataforma) {
    const mola = cena.add.image(plataforma.x, topoTronco(plataforma) + 4, 'esp_mola').setOrigin(0.5, 1).setDepth(0.4);
    mola.setScale(44 / mola.width);
    mola.escalaBase = mola.scaleY;
    mola.alturaBase = mola.displayHeight;
    plataforma.mola = mola;
    plataforma.once('destroy', () => mola.destroy());
}

// Enquanto o gato desce em cima dela, a mola vai encolhendo junto com os pes, para ele nao entrar na arte.
function apertarMola(cena, plataforma) {
    const mola = plataforma.mola;
    if (cena.tweens.isTweening(mola)) return;
    const corpo = cena.caixa.body;
    const livre = mola.y - corpo.bottom;
    const emCima = corpo.velocity.y > 0 && livre > -2 && livre < mola.alturaBase + 30 &&
        Math.abs(corpo.center.x - plataforma.x) < plataforma.displayWidth / 2 + corpo.halfWidth;
    const escala = emCima ? Phaser.Math.Clamp(livre / mola.alturaBase, 0.45, 1) : 1;
    mola.scaleY = mola.escalaBase * escala;
}

// A mola encolhe com o peso e joga o gato bem mais alto que o pulo normal.
function pularNaMola(cena, plataforma) {
    const caixa = cena.caixa;
    caixa.body.setVelocityY(-impulsoMola * cena.velocidadeJogo);
    som.mola();
    deformarGato(cena, 1.45, 0.6, 520);
    cena.efeitos.poeira.explode(9, caixa.x, caixa.y + 36);
    mostrarPopup(cena, plataforma.x, topoTronco(plataforma) - 24, 'BOING!', '#ffd24a', 16);
    const mola = plataforma.mola;
    cena.tweens.killTweensOf(mola);
    mola.scaleY = mola.escalaBase * 0.45;
    cena.tweens.add({
        targets: mola, scaleY: mola.escalaBase, duration: 650,
        ease: 'Elastic.easeOut', easeParams: [1.3, 0.3]
    });
}

// Bolha com um poder, flutuando no meio do tronco. Escudo so depois que os passaros chegam.
function criarItemPoder(cena, plataforma) {
    const opcoes = Object.keys(poderes).filter((tipo) => tipo !== cena.ultimoPoder &&
        (tipo !== 'escudo' || plataforma.numero >= troncoPassaros));
    const tipo = Phaser.Utils.Array.GetRandom(opcoes);
    cena.ultimoPoder = tipo;
    const item = cena.add.container(plataforma.x, plataforma.y - 62, [
        cena.add.image(0, 0, 'pw_brilho').setScale(1 / 3).setTint(poderes[tipo].cor).setAlpha(0.55),
        cena.add.image(0, 0, 'pw_' + tipo).setScale(1 / 3),
        cena.add.image(0, 0, 'pw_bolha').setScale(1 / 3)
    ]).setDepth(2.2);
    item.tipo = tipo;
    item.plataforma = plataforma;
    item.yBase = item.y;
    item.fase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    plataforma.temItem = true;
    cena.itensPoder.push(item);
}

function atualizarItensPoder(cena, delta) {
    const tempo = cena.tempoMoedas / 1000;
    const corpo = cena.caixa.body;
    const limite = cena.cameras.main.scrollY + config.height + 60;
    for (let i = cena.itensPoder.length - 1; i >= 0; i--) {
        const item = cena.itensPoder[i];
        if (item.yBase > limite) {
            item.destroy();
            cena.itensPoder.splice(i, 1);
            continue;
        }
        if (item.plataforma.active) {
            item.x = item.plataforma.x;
            item.yBase = item.plataforma.y - 62;
        }
        item.y = item.yBase + Math.sin(tempo * 2.4 + item.fase) * 6;
        // A bolha balanca como gelatina e o brilho de tras gira devagar.
        const bolha = item.list[2];
        bolha.setScale((1 + Math.sin(tempo * 5 + item.fase) * 0.05) / 3,
            (1 - Math.sin(tempo * 5 + item.fase) * 0.05) / 3);
        item.list[0].angle = tempo * 40;
        item.list[1].angle = Math.sin(tempo * 3 + item.fase) * 10;
        if (!cena.morreu && Math.hypot(corpo.center.x - item.x, corpo.center.y - item.y) < 46) {
            cena.itensPoder.splice(i, 1);
            pegarPoder(cena, item);
        }
    }
}

function pegarPoder(cena, item) {
    const dados = poderes[item.tipo];
    const anel = cena.add.circle(item.x, item.y, 24).setStrokeStyle(3, 0xffffff, 0.9).setDepth(6);
    cena.tweens.add({
        targets: anel, scale: 2.2, alpha: 0, duration: 380, ease: 'Quad.easeOut',
        onComplete: () => anel.destroy()
    });
    cena.efeitos.brilho.explode(16, item.x, item.y);
    som.poder();
    mostrarFaixa(cena, dados.nome + '!', dados.dica, '#' + dados.cor.toString(16).padStart(6, '0'));
    registrarMissao(cena, 'poderes', 1);
    item.destroy();
    ativarPoder(cena, item.tipo);
}

// Pegar de novo um poder que ja esta ativo so renova o tempo.
function ativarPoder(cena, tipo) {
    const dados = poderes[tipo];
    const atual = cena.poderes[tipo];
    if (atual) {
        atual.resta = dados.duracao;
        return;
    }
    const poder = { resta: dados.duracao, efeito: null, tempo: 0 };
    cena.poderes[tipo] = poder;
    if (tipo === 'escudo') {
        poder.efeito = cena.add.image(cena.gato.x, cena.gato.y - 40, 'pw_campo').setScale(0.2 / 3).setDepth(5.2);
        cena.tweens.add({ targets: poder.efeito, scale: 1 / 3, duration: 380, ease: 'Back.easeOut' });
    } else if (tipo === 'ima') {
        poder.efeito = cena.add.graphics().setDepth(4.8);
    } else if (tipo === 'pacote') {
        furarPacote(cena);
    }
    // Icone redondo no placar, com um anel que esvazia conforme o tempo acaba.
    const anel = cena.add.graphics();
    poder.icone = cena.add.container(0, 66, [
        cena.add.graphics().fillStyle(0x1a0e08, 0.35).fillCircle(0, 3, 17),
        cena.add.image(0, 0, texturaMadeira(cena, 34, 34, { raio: 15 })).setScale(1 / escalaMadeira),
        cena.add.image(0, 0, 'pw_' + tipo).setScale(20 / 90),
        anel
    ]).setScrollFactor(0).setDepth(10).setScale(0);
    poder.anel = anel;
    cena.tweens.add({ targets: poder.icone, scale: 1, duration: 300, ease: 'Back.easeOut' });
    organizarIconesPoder(cena);
}

function organizarIconesPoder(cena) {
    Object.values(cena.poderes).forEach((poder, i) => {
        cena.tweens.add({ targets: poder.icone, x: 30 + i * 40, duration: 200, ease: 'Sine.easeOut' });
    });
}

function encerrarPoder(cena, tipo, animar = true) {
    const poder = cena.poderes[tipo];
    if (!poder) return;
    delete cena.poderes[tipo];
    const efeito = poder.efeito;
    if (efeito && animar && tipo === 'escudo') {
        cena.tweens.add({
            targets: efeito, scale: 1.5 / 3, alpha: 0, duration: 260, onComplete: () => efeito.destroy()
        });
    } else if (efeito) {
        efeito.destroy();
    }
    const icone = poder.icone;
    cena.tweens.add({ targets: icone, scale: 0, duration: 200, ease: 'Back.easeIn', onComplete: () => icone.destroy() });
    if (animar && tipo !== 'escudo') som.fimPoder();
    organizarIconesPoder(cena);
}

function atualizarPoderes(cena, delta) {
    const segundos = delta / 1000;
    const corpo = cena.caixa.body;
    for (const tipo of Object.keys(cena.poderes)) {
        const poder = cena.poderes[tipo];
        const dados = poderes[tipo];
        poder.resta -= segundos;
        poder.tempo += segundos;
        if (poder.resta <= 0) {
            encerrarPoder(cena, tipo);
            continue;
        }
        const fracao = poder.resta / dados.duracao;
        poder.anel.clear().lineStyle(3, 0x1a0e08, 0.5).strokeCircle(0, 0, 15);
        poder.anel.lineStyle(3, dados.cor, 1).beginPath()
            .arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fracao, false).strokePath();
        // Pisca nos ultimos 2 segundos, avisando que vai acabar.
        const acabando = poder.resta < 2 && Math.floor(poder.resta * 6) % 2 === 0;
        poder.icone.setAlpha(acabando ? 0.45 : 1);
        if (tipo === 'escudo') {
            poder.efeito.setPosition(cena.gato.x, cena.gato.y - 40)
                .setAngle(poder.tempo * 30).setAlpha(acabando ? 0.35 : 0.8 + Math.sin(poder.tempo * 6) * 0.2);
        } else if (tipo === 'ima') {
            // Ondas vermelhas fechando em volta do gato mostram o alcance do ima.
            const g = poder.efeito.clear();
            for (let k = 0; k < 2; k++) {
                const t = (poder.tempo * 0.9 + k / 2) % 1;
                g.lineStyle(2, dados.cor, (acabando ? 0.15 : 0.35) * t).strokeCircle(corpo.center.x, corpo.center.y,
                    raioIma * (1 - t) + 20);
            }
            for (const moeda of cena.moedas.getChildren()) {
                if (moeda.atraida || moeda.coletada || moeda.escondida || !moeda.visible) continue;
                if (Math.hypot(moeda.x - corpo.center.x, moeda.y - corpo.center.y) < raioIma) moeda.atraida = true;
            }
        } else if (tipo === 'pacote' && cena.guaxinim) {
            // O pacote vai perdendo granulados pelo furo.
            poder.proximoGranulo = (poder.proximoGranulo || 0) - segundos;
            if (poder.proximoGranulo <= 0) {
                poder.proximoGranulo = 0.14;
                const guaxinim = cena.guaxinim;
                cena.efeitos.granulos.explode(1, guaxinim.visual.x + guaxinim.direcao * 19, guaxinim.visual.y - 14);
            }
        }
    }
}

// O pacote do guaxinim fura: todo tronco a frente ganha um granulado.
function furarPacote(cena) {
    for (const plataforma of cena.plataformas.getChildren()) {
        if (plataforma.numero > cena.ultimoTronco && !plataforma.temItem) criarMoeda(cena, plataforma);
    }
    const guaxinim = cena.guaxinim;
    if (!guaxinim) return;
    guaxinim.expressao = 'guaxinim_susto';
    guaxinim.expressaoAte = guaxinim.tempo + 1.2;
    mostrarPopup(cena, guaxinim.visual.x, guaxinim.visual.y - 66, 'meu pacote!', '#f2f2f2', 14);
    cena.efeitos.granulos.explode(6, guaxinim.visual.x + guaxinim.direcao * 19, guaxinim.visual.y - 20);
}

// O escudo segura a bicada: o passaro (ou OVNI) bate, volta e vai embora.
function defenderComEscudo(cena, passaro) {
    passaro.acertou = true;
    passaro.direcao *= -1;
    passaro.imagem.setFlipX(passaro.direcao < 0);
    cena.caixa.protegidoAte = cena.time.now + 700;
    const efeito = cena.poderes.escudo.efeito;
    cena.efeitos.brilho.explode(14, efeito.x, efeito.y);
    mostrarPopup(cena, cena.caixa.x, cena.caixa.y - 60, 'DEFENDEU!', '#7cc8ff', 18);
    cena.cameras.main.shake(100, 0.003);
    som.escudo();
    encerrarPoder(cena, 'escudo');
}

function ajustarLarguraTronco(cena, plataforma) {
    // Preserva o chao e os troncos ja alcancados.
    if (plataforma.numero === 0 || plataforma.contada) return;
    const nivel = Math.floor(cena.contador / 20);
    const bonusLargura = plataforma.fragil ? 1.25 : 1;
    const largura = Math.round(Math.max(40, plataforma.larguraOriginal * 0.9 ** nivel) * bonusLargura);
    plataforma.setDisplaySize(largura, plataforma.displayHeight);
    plataforma.x = Phaser.Math.Clamp(plataforma.x, largura / 2 + 12,
        config.width - largura / 2 - 12);
    plataforma.body.updateFromGameObject();
}

function gerarPlataformas(cena) {
    // Mantem plataformas prontas acima da tela, com saltos alcancaveis.
    while (cena.ultimaPlataformaY > cena.cameras.main.scrollY - 200) {
        const largura = Phaser.Math.Between(70, 115);
        const margem = Math.ceil(largura / 2) + 12;
        // O pulo sobe cerca de 267 px; deixa uma folga no maior intervalo.
        cena.ultimaPlataformaY -= Phaser.Math.Between(190, 235);
        // Evita sequencias empilhadas: centros separados por pelo menos 100 px.
        const posicoes = [];
        for (let x = margem; x <= config.width - margem; x++) {
            if (Math.abs(x - cena.ultimaPlataformaX) >= 100) posicoes.push(x);
        }
        cena.ultimaPlataformaX = posicoes[Phaser.Math.Between(0, posicoes.length - 1)];
        criarPlataforma(cena, cena.ultimaPlataformaX, cena.ultimaPlataformaY, largura);
    }
}

// Reutilizavel para abrir o plano novamente em uma futura cena da historia.
function enquadrarCenario(cena, larguraTronco, duracao = 900, aoConcluir = () => {}) {
    cena.tweens.killTweensOf(cena.cenario);
    if (duracao <= 0) {
        cena.cenario.larguraTronco = larguraTronco;
        atualizarCenario(cena, 0);
        aoConcluir();
        return;
    }
    cena.tweens.add({
        targets: cena.cenario,
        larguraTronco,
        duration: duracao,
        ease: 'Sine.easeInOut',
        onUpdate: () => atualizarCenario(cena, 0),
        onComplete: aoConcluir
    });
}

function atualizarCenario(cena, delta) {
    const fundo = cena.cenario;
    const escala = config.width * fundo.larguraTronco / texturaCenario.larguraMadeira;
    // Centraliza pela madeira da arte e, no cenario antigo, alarga a arte em 15%.
    fundo.base.setScale(escala * texturaCenario.esticamento, escala);
    fundo.base.x = config.width / 2;
    fundo.alvo = Math.max(fundo.alvo,
        (fundo.alturaInicialGato - cena.caixa.y) * fundo.paralaxe);
    const suavizacao = 1 - Math.exp(-5 * delta / 1000);
    fundo.deslocamento += (fundo.alvo - fundo.deslocamento) * suavizacao;
    // Revela a arte durante a subida e mantem o topo cobrindo a tela ao final.
    fundo.base.y = config.height + Math.min(fundo.deslocamento,
        Math.max(0, texturaCenario.altura * escala - config.height));
    fundo.base.list.forEach(function (trecho) {
        const topo = fundo.base.y + trecho.y * escala;
        trecho.setVisible(topo < config.height && topo + trecho.height * escala > 0);
    });
}

// Mistura duas cores 0xRRGGBB; t vai de 0 (a) a 1 (b).
function misturarCor(a, b, t) {
    const canal = (deslocamento) => {
        const inicio = (a >> deslocamento) & 255;
        const fim = (b >> deslocamento) & 255;
        return Math.round(inicio + (fim - inicio) * t) << deslocamento;
    };
    return canal(16) | canal(8) | canal(0);
}

// Estrelas, lua, Terra e planeta, desenhados em 2x para ficarem nitidos com o zoom.
function criarTexturasCeu(cena) {
    if (cena.textures.exists('ceu_estrelas')) return;
    const g = cena.make.graphics({ add: false });
    for (let i = 0; i < 160; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1)).fillCircle(
            Phaser.Math.Between(0, 1023), Phaser.Math.Between(0, 1023), Math.random() < 0.85 ? 1.6 : 2.8);
    }
    g.generateTexture('ceu_estrelas', 1024, 1024);
    // Lua com brilho em volta e crateras.
    g.clear().fillStyle(0xfff6d8, 0.08).fillCircle(64, 64, 62).fillStyle(0xfff6d8, 0.12).fillCircle(64, 64, 52);
    g.fillStyle(0xf4efd6).fillCircle(64, 64, 40);
    g.fillStyle(0xd9d1b0);
    [[50, 52, 9], [78, 70, 7], [60, 82, 5], [80, 48, 4]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.generateTexture('ceu_lua', 128, 128);
    // Terra: oceano, continentes, nuvens e a atmosfera azul clara.
    g.clear().fillStyle(0x8fd0ff, 0.12).fillCircle(100, 100, 98).fillStyle(0x8fd0ff, 0.18).fillCircle(100, 100, 90);
    g.fillStyle(0x2f78d6).fillCircle(100, 100, 82);
    g.fillStyle(0x4caf50);
    [[74, 70, 40, 30], [66, 96, 22, 36], [128, 112, 36, 44], [120, 64, 18, 14], [96, 146, 30, 12]]
        .forEach(([x, y, w, h]) => g.fillEllipse(x, y, w, h));
    g.fillStyle(0xffffff, 0.8);
    [[96, 48, 46, 8], [136, 86, 30, 7], [58, 124, 34, 7], [110, 160, 40, 6]]
        .forEach(([x, y, w, h]) => g.fillEllipse(x, y, w, h));
    g.lineStyle(4, 0xbfe6ff, 0.7).strokeCircle(100, 100, 83);
    g.generateTexture('ceu_terra', 200, 200);
    // Planeta com anel: anel inteiro, planeta por cima e a metade da frente do anel.
    const anel = (inicio, fim) => {
        const pontos = [];
        for (let a = inicio; a <= fim + 0.001; a += Math.PI / 24) {
            pontos.push({ x: 80 + Math.cos(a) * 66, y: 50 + Math.sin(a) * 16 });
        }
        return pontos;
    };
    g.clear().lineStyle(6, 0xf3dca8, 0.85).strokePoints(anel(Math.PI, Math.PI * 2));
    g.fillStyle(0xe8b86a).fillCircle(80, 50, 34);
    g.fillStyle(0xd49a4a).fillEllipse(80, 40, 64, 8).fillEllipse(80, 60, 62, 7);
    g.lineStyle(6, 0xf3dca8, 0.95).strokePoints(anel(0, Math.PI));
    g.generateTexture('ceu_planeta', 160, 100);
    criarTexturasEspaco(g);
    g.destroy();
}

// Planetas, asteroides, nebulosa, satelite e o Planeta Casspet, que passam no espaco.
function criarTexturasEspaco(g) {
    const listrado = (chave, base, faixas) => {
        g.clear().fillStyle(base).fillCircle(64, 64, 56);
        faixas.forEach(([y, altura, cor]) => g.fillStyle(cor).fillEllipse(64, y, 112 - Math.abs(y - 64) * 1.2, altura));
        g.fillStyle(0xffffff, 0.18).fillEllipse(46, 42, 34, 22);
        g.generateTexture(chave, 128, 128);
    };
    listrado('esp_gasoso_1', 0xe39b5b, [[40, 10, 0xc9773f], [58, 7, 0xf2c38c], [76, 12, 0xb8662f], [94, 8, 0xf0b579]]);
    listrado('esp_gasoso_2', 0x6fa8d8, [[38, 8, 0x4f86c0], [60, 12, 0xa9d4f2], [84, 9, 0x3f73ad]]);
    // Planeta vermelho com crateras.
    g.clear().fillStyle(0xc4553a).fillCircle(64, 64, 50);
    g.fillStyle(0x9e3f2a);
    [[46, 48, 10], [80, 70, 13], [58, 88, 7], [86, 40, 6]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.fillStyle(0xffffff, 0.16).fillEllipse(48, 42, 30, 18);
    g.generateTexture('esp_vermelho', 128, 128);
    // Planeta de gelo com anel roxo.
    g.clear().lineStyle(6, 0xb58cf0, 0.85).strokeEllipse(80, 60, 150, 34);
    g.fillStyle(0xdff4ff).fillCircle(80, 60, 36);
    g.fillStyle(0xb8e2f7).fillEllipse(70, 50, 30, 14).fillEllipse(92, 72, 24, 10);
    g.fillStyle(0xffffff, 0.35).fillEllipse(68, 46, 20, 12);
    g.lineStyle(6, 0xc9a6ff, 0.95);
    const frente = [];
    for (let a = 0; a <= Math.PI + 0.001; a += Math.PI / 24) frente.push({ x: 80 + Math.cos(a) * 75, y: 60 + Math.sin(a) * 17 });
    g.strokePoints(frente);
    g.generateTexture('esp_anel', 160, 120);
    // Asteroide irregular.
    const pedra = [];
    for (let k = 0; k < 9; k++) {
        const a = k / 9 * Math.PI * 2;
        const r = 22 + (k % 3) * 4 - (k % 2) * 3;
        pedra.push({ x: 32 + Math.cos(a) * r, y: 32 + Math.sin(a) * r });
    }
    g.clear().fillStyle(0x8d8591).fillPoints(pedra, true).lineStyle(2, 0x5c5560).strokePoints(pedra, true);
    g.fillStyle(0x6d6571).fillCircle(26, 28, 5).fillCircle(40, 40, 4);
    g.generateTexture('esp_asteroide', 64, 64);
    // Nebulosa: manchas macias e transparentes; a cor vem do tint.
    g.clear();
    [[128, 90, 80], [90, 110, 60], [170, 120, 56], [120, 140, 50], [70, 80, 40]].forEach(([x, y, r]) => {
        for (let k = 4; k >= 1; k--) g.fillStyle(0xffffff, 0.05).fillCircle(x, y, r * k / 4);
    });
    g.generateTexture('esp_nebulosa', 256, 220);
    // Satelite com paineis solares e uma patinha no corpo.
    g.clear().fillStyle(0x3b5da8).fillRect(4, 22, 34, 20).fillRect(90, 22, 34, 20);
    g.lineStyle(1.5, 0x9fc1ff, 0.8);
    [13, 21, 29, 99, 107, 115].forEach((x) => g.lineBetween(x, 22, x, 42));
    g.lineStyle(3, 0xc9ccd6).lineBetween(38, 32, 48, 32).lineBetween(80, 32, 90, 32);
    g.fillStyle(0xe8e3d6).fillRoundedRect(48, 16, 32, 32, 5);
    desenharPatinha(g, 64, 33, 0.32, 0xc58b55);
    g.lineStyle(2, 0xc9ccd6).lineBetween(64, 16, 64, 6);
    g.fillStyle(0xff6f6f).fillCircle(64, 5, 3);
    g.generateTexture('esp_satelite', 128, 64);
    // Planeta Casspet: cor de granulado, cratera em forma de patinha e anel de granulados.
    const granulosAnel = (inicio, fim) => {
        g.lineStyle(7, 0xb07845, 0.45);
        const faixa = [];
        for (let a = inicio; a <= fim + 0.001; a += Math.PI / 24) faixa.push({ x: 90 + Math.cos(a) * 82, y: 80 + Math.sin(a) * 19 });
        g.strokePoints(faixa);
        for (let a = inicio + Math.PI / 36; a < fim; a += Math.PI / 18) {
            const x = 90 + Math.cos(a) * 82;
            const y = 80 + Math.sin(a) * 19;
            g.fillStyle(0xc58b55).fillRoundedRect(x - 4, y - 2.5, 8, 5, 2.5);
            g.fillStyle(0xe8b77e).fillRoundedRect(x - 3, y - 2, 5, 1.6, 0.8);
        }
    };
    g.clear();
    granulosAnel(Math.PI, Math.PI * 2);
    g.fillStyle(0xd9a066).fillCircle(90, 80, 52);
    g.fillStyle(0xc58b55);
    [[64, 56, 6], [112, 104, 5], [70, 108, 4], [118, 58, 4]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    // A patinha e uma cratera: borda clara e fundo escuro.
    desenharPatinha(g, 92, 82, 1.06, 0xf0c48a);
    desenharPatinha(g, 92, 84, 1, 0x8a5a35);
    g.fillStyle(0xffffff, 0.16).fillEllipse(66, 50, 34, 20);
    granulosAnel(0, Math.PI);
    g.generateTexture('esp_casspet', 180, 160);
}

// Patinha: almofada grande e quatro dedos.
function desenharPatinha(g, x, y, escala, cor) {
    g.fillStyle(cor);
    g.fillEllipse(x, y + 10 * escala, 34 * escala, 27 * escala);
    [[-21, -10, 6.5], [-8, -21, 7], [8, -21, 7], [21, -10, 6.5]].forEach(([dx, dy, r]) =>
        g.fillEllipse(x + dx * escala, y + dy * escala, r * 1.7 * escala, r * 2.1 * escala));
}

// Objetos do espaco descem conforme o gato sobe (os maiores, mais perto, descem mais
// rapido), giram e derivam devagar, para o fundo nunca ficar parado.
function atualizarEspaco(cena, delta, espaco, soltar) {
    if (!cena.espaco) cena.espaco = { objetos: [], distancia: 0, criados: 0, ultimoScroll: cena.cameras.main.scrollY };
    const estado = cena.espaco;
    const scroll = cena.cameras.main.scrollY;
    const subida = Math.max(0, estado.ultimoScroll - scroll);
    estado.ultimoScroll = scroll;
    const segundos = delta / 1000;
    // Folhas caindo nao combinam com o espaco.
    const folhas = cena.folhasJogo;
    if (folhas && folhas.active && espaco > 0.5 === folhas.emitting) {
        if (folhas.emitting) folhas.stop();
        else folhas.start();
    }
    if (soltar && cena.iniciado) {
        estado.distancia += subida * 0.3 + segundos * 12;
        if (estado.distancia > (estado.proximo || 120)) {
            estado.distancia = 0;
            estado.proximo = Phaser.Math.Between(170, 300);
            criarObjetoEspaco(cena);
        }
    }
    for (let i = estado.objetos.length - 1; i >= 0; i--) {
        const objeto = estado.objetos[i];
        const imagem = objeto.imagem;
        imagem.y += subida * objeto.paralaxe + objeto.vy * segundos;
        imagem.x += objeto.vx * segundos;
        imagem.angle += objeto.giro * segundos;
        imagem.setAlpha(objeto.alfa * Phaser.Math.Clamp(espaco, 0, 1));
        if (imagem.y - imagem.displayHeight > config.height + 40 ||
            imagem.x < -imagem.displayWidth || imagem.x > config.width + imagem.displayWidth) {
            imagem.destroy();
            estado.objetos.splice(i, 1);
        }
    }
}

function criarObjetoEspaco(cena) {
    const estado = cena.espaco;
    estado.criados += 1;
    // O Planeta Casspet aparece logo no comeco do espaco e depois de vez em quando.
    const casspet = estado.criados === 3 || (estado.criados > 3 && Math.random() < 0.1);
    const tipo = casspet ? 'casspet' : Phaser.Utils.Array.GetRandom(
        ['gasoso', 'gasoso', 'vermelho', 'anel', 'asteroide', 'asteroide', 'asteroide', 'nebulosa', 'satelite']);
    const opcoes = {
        casspet: { chave: 'esp_casspet', escala: [0.75, 0.85], giro: 0 },
        gasoso: { chave: Math.random() < 0.5 ? 'esp_gasoso_1' : 'esp_gasoso_2', escala: [0.35, 0.7], giro: 0 },
        vermelho: { chave: 'esp_vermelho', escala: [0.3, 0.55], giro: 4 },
        anel: { chave: 'esp_anel', escala: [0.4, 0.55], giro: 0 },
        asteroide: { chave: 'esp_asteroide', escala: [0.25, 0.55], giro: 40 },
        nebulosa: { chave: 'esp_nebulosa', escala: [0.9, 1.3], giro: 0 },
        satelite: { chave: 'esp_satelite', escala: [0.4, 0.5], giro: 12 }
    }[tipo];
    const escala = Phaser.Math.FloatBetween(opcoes.escala[0], opcoes.escala[1]);
    const imagem = cena.add.image(Phaser.Math.Between(30, config.width - 30), 0, opcoes.chave)
        .setScale(escala).setScrollFactor(0).setDepth(tipo === 'nebulosa' ? -2.88 : -2.8)
        .setAngle(Phaser.Math.Between(-20, 20));
    imagem.y = -imagem.displayHeight / 2 - 10;
    if (tipo === 'nebulosa') imagem.setTint(Phaser.Utils.Array.GetRandom([0xb07cff, 0x5fd3c8, 0xff7fb0]));
    const sentido = Math.random() < 0.5 ? -1 : 1;
    estado.objetos.push({
        imagem,
        alfa: tipo === 'nebulosa' ? 0.8 : 1,
        paralaxe: tipo === 'nebulosa' ? 0.08 : 0.12 + escala * 0.3,
        vy: Phaser.Math.Between(6, 14),
        vx: sentido * Phaser.Math.Between(2, tipo === 'asteroide' || tipo === 'satelite' ? 22 : 8),
        giro: sentido * opcoes.giro * Phaser.Math.FloatBetween(0.5, 1)
    });
}

// Ceu atras do cenario (que nao tem ceu): degrade, sol, estrelas, lua e planetas.
function criarCeu(cena) {
    criarTexturasCeu(cena);
    const fixo = (objeto, profundidade) => objeto.setScrollFactor(0).setDepth(profundidade);
    const brilhos = [];
    for (let i = 0; i < 14; i++) {
        brilhos.push({
            imagem: fixo(cena.add.image(0, 0, 'fx_estrela').setScale(Phaser.Math.FloatBetween(0.35, 0.7)), -2.9),
            x: Phaser.Math.Between(12, config.width - 12),
            y: Phaser.Math.Between(0, config.height),
            fase: Math.random() * Math.PI * 2,
            velocidade: Phaser.Math.FloatBetween(1.5, 4)
        });
    }
    cena.ceu = {
        degrade: fixo(cena.add.graphics(), -3),
        estrelas: fixo(cena.add.tileSprite(0, 0, config.width, config.height, 'ceu_estrelas')
            .setOrigin(0, 0).setTileScale(0.5), -2.9),
        brilhos,
        halo: fixo(cena.add.circle(0, 0, 1, 0xffffff), -2.85),
        sol: fixo(cena.add.circle(0, 0, 1, 0xffffff), -2.85),
        lua: fixo(cena.add.image(68, config.height * 0.2, 'ceu_lua').setScale(0.5), -2.85),
        terra: fixo(cena.add.image(290, config.height * 0.68, 'ceu_terra').setScale(0.5), -2.85),
        planeta: fixo(cena.add.image(296, config.height * 0.24, 'ceu_planeta').setScale(0.5), -2.85),
        chave: '', luz: -1, fase: 0, tempo: 0, proximaCadente: 0
    };
    atualizarCeu(cena, 0);
}

function atualizarCeu(cena, delta) {
    const ceu = cena.ceu;
    ceu.tempo += delta / 1000;
    const troncos = Math.max(0, cena.alturaMax) / alturaPorTronco;
    let indice = 0;
    while (indice < fasesCeu.length - 1 && troncos >= fasesCeu[indice + 1].troncos) indice++;
    const atual = fasesCeu[indice];
    const proxima = fasesCeu[Math.min(indice + 1, fasesCeu.length - 1)];
    const t = Phaser.Math.Clamp((troncos - (proxima.troncos - transicaoCeu)) / transicaoCeu, 0, 1);
    const valor = (campo) => Phaser.Math.Linear(atual[campo], proxima[campo], t);
    const cor = (campo) => misturarCor(atual[campo], proxima[campo], t);
    if (indice > ceu.fase) {
        ceu.fase = indice;
        if (mostrarAvisosCeu) mostrarFaixa(cena, atual.aviso[0], atual.aviso[1], atual.cor);
    }

    // O degrade so e redesenhado quando as cores mudam.
    const topo = cor('topo');
    const meio = cor('meio');
    const base = cor('base');
    const chave = topo + ',' + meio + ',' + base;
    if (chave !== ceu.chave) {
        ceu.chave = chave;
        const metade = config.height / 2;
        ceu.degrade.clear()
            .fillGradientStyle(topo, topo, meio, meio, 1).fillRect(0, 0, config.width, metade)
            .fillGradientStyle(meio, meio, base, base, 1).fillRect(0, metade, config.width, config.height - metade);
    }
    const luz = cor('luz');
    if (luz !== ceu.luz) {
        ceu.luz = luz;
        cena.cenario.base.list.forEach((trecho) => trecho.setTint(luz));
    }

    // O sol desce, cresce e avermelha ate sumir embaixo da tela.
    const alturaSol = valor('sol');
    const raio = 22 + Phaser.Math.Clamp((alturaSol - 0.14) / 0.71, 0, 1) * 14;
    const ySol = config.height * alturaSol;
    const corSol = cor('corSol');
    const solVisivel = ySol - raio * 1.9 < config.height;
    ceu.sol.setPosition(296, ySol).setRadius(raio).setFillStyle(corSol).setVisible(solVisivel);
    ceu.halo.setPosition(296, ySol).setRadius(raio * 1.9).setFillStyle(corSol, 0.22).setVisible(solVisivel);

    // As estrelas descem devagar enquanto o gato sobe e piscam.
    const estrelas = valor('estrelas');
    // No espaco as estrelas tambem andam com o tempo, mesmo com o gato parado.
    ceu.derivaTempo = (ceu.derivaTempo || 0) + delta / 1000 * 5 * valor('espaco');
    const deriva = troncos * alturaPorTronco * 0.03 + ceu.derivaTempo;
    ceu.estrelas.setVisible(estrelas > 0).setAlpha(estrelas);
    ceu.estrelas.tilePositionY = -deriva * 2;
    ceu.brilhos.forEach((brilho) => {
        const pisca = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ceu.tempo * brilho.velocidade + brilho.fase));
        brilho.imagem.setPosition(brilho.x, Phaser.Math.Wrap(brilho.y + deriva, -10, config.height + 10))
            .setAlpha(estrelas * pisca).setVisible(estrelas > 0);
    });
    // No espaco a Lua, a Terra e o planeta com anel descem devagar e ficam para tras.
    const subidaEspaco = Math.max(0, troncos - troncoFimCopa) * alturaPorTronco * 0.08;
    const lua = valor('lua');
    ceu.lua.setAlpha(lua).setVisible(lua > 0).setY(config.height * 0.2 + subidaEspaco * 0.7);
    const espaco = valor('espaco');
    ceu.terra.setAlpha(espaco).setVisible(espaco > 0).setAngle(ceu.tempo * 3)
        .setY(config.height * 0.68 + subidaEspaco);
    ceu.planeta.setAlpha(espaco).setVisible(espaco > 0).setY(config.height * 0.24 + subidaEspaco * 0.85);
    atualizarEspaco(cena, delta, espaco, troncos >= troncoFimCopa - 10);
    if (estrelas > 0.5 && cena.iniciado && cena.time.now > ceu.proximaCadente) {
        ceu.proximaCadente = cena.time.now + Phaser.Math.Between(2500, 6000);
        criarEstrelaCadente(cena);
    }
}

// Risco de luz que cruza o ceu na diagonal, com o rastro atras da ponta.
function criarEstrelaCadente(cena) {
    const x = Phaser.Math.Between(60, config.width - 60);
    const y = Phaser.Math.Between(70, config.height * 0.4);
    const lado = Math.random() < 0.5 ? -1 : 1;
    const angulo = Phaser.Math.DegToRad(25);
    const rastro = cena.add.rectangle(x, y, 64, 2, 0xffffff).setOrigin(lado > 0 ? 1 : 0, 0.5)
        .setAngle(lado * 25).setScrollFactor(0).setDepth(-2.9).setAlpha(0);
    cena.tweens.add({
        targets: rastro, x: x + lado * Math.cos(angulo) * 150, y: y + Math.sin(angulo) * 150,
        duration: 700, ease: 'Sine.easeIn'
    });
    cena.tweens.add({
        targets: rastro, alpha: 0.9, duration: 150, hold: 350, yoyo: true,
        onComplete: () => rastro.destroy()
    });
}

// Tabua de madeira com cantos arredondados, feita com a madeira lisa das placas da arte do
// menu, em faixas como tabuas. escurecer (0 a 1) deixa a madeira mais escura.
function texturaMadeira(cena, largura, altura, { raio = 12, escurecer = 0, borda = 0x4d2710 } = {}) {
    const chave = `madeira_${largura}_${altura}_${raio}_${escurecer}_${borda}`;
    if (cena.textures.exists(chave)) return chave;
    const e = escalaMadeira;
    const textura = cena.textures.createCanvas(chave, largura * e, altura * e);
    const ctx = textura.getContext();
    const fonte = cena.textures.get('introducao').getSourceImage();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(2 * e, 2 * e, (largura - 4) * e, (altura - 4) * e, raio * e);
    ctx.clip();
    const tabua = 26 * e;
    for (let y = 0, i = 0; y < altura * e; y += tabua, i++) {
        // Cada tabua usa um trecho diferente da madeira, para as faixas nao se repetirem.
        ctx.drawImage(fonte, 582 + (i % 3) * 8, 962 + (i % 2) * 20, 70, 30, -6 * e * (i % 2), y, (largura + 6) * e, tabua);
        ctx.fillStyle = 'rgba(77, 39, 16, 0.35)';
        ctx.fillRect(0, y, largura * e, 1.5 * e);
    }
    ctx.fillStyle = 'rgba(255, 236, 200, 0.22)';
    ctx.fillRect(0, 2 * e, largura * e, 3 * e);
    if (escurecer) {
        ctx.fillStyle = `rgba(30, 14, 6, ${escurecer})`;
        ctx.fillRect(0, 0, largura * e, altura * e);
    }
    ctx.restore();
    ctx.lineWidth = 3 * e;
    ctx.strokeStyle = '#' + borda.toString(16).padStart(6, '0');
    ctx.beginPath();
    ctx.roundRect(2 * e, 2 * e, (largura - 4) * e, (altura - 4) * e, raio * e);
    ctx.stroke();
    ctx.lineWidth = 1.2 * e;
    ctx.strokeStyle = 'rgba(255, 220, 160, 0.35)';
    ctx.beginPath();
    ctx.roundRect(5 * e, 5 * e, (largura - 10) * e, (altura - 10) * e, Math.max(2, raio - 3) * e);
    ctx.stroke();
    textura.refresh();
    return chave;
}

// Botao de madeira com texto; da um pulinho ao toque. cor pinta a madeira (0xffffff = natural).
function criarBotaoMadeira(cena, x, y, largura, altura, texto, acao, { tamanho = 17, cor = 0xffffff } = {}) {
    const fundo = cena.add.image(0, 0, texturaMadeira(cena, largura, altura, { raio: Math.min(14, altura / 2 - 2) }))
        .setScale(1 / escalaMadeira).setTint(cor);
    const rotulo = cena.add.text(0, 1, texto, {
        resolution: 4, fontFamily: 'Arial Black, Arial, sans-serif', fontSize: tamanho + 'px', fontStyle: 'bold',
        color: '#4d2710', stroke: '#f6c98f', strokeThickness: 3
    }).setOrigin(0.5);
    // scrollFactor 0 tambem no botao: dentro de paineis fixos, o toque nao pode seguir a camera.
    const botao = cena.add.container(x, y, [fundo, rotulo]).setSize(largura, altura).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
    botao.on('pointerdown', (ponteiro, xLocal, yLocal, evento) => {
        // Nao deixa o toque chegar a tela de pausa ou a outros botoes.
        evento.stopPropagation();
        som.iniciar();
        som.clique();
        cena.tweens.killTweensOf(botao);
        botao.setScale(0.92);
        cena.tweens.add({ targets: botao, scale: 1, duration: 260, ease: 'Back.easeOut' });
        acao();
    });
    botao.rotulo = rotulo;
    return botao;
}

// Tela das missoes do dia: cada uma com a barra de progresso e o premio.
function mostrarMissoes(cena, aoFechar, profundidade = 30) {
    const altura = config.height;
    const tela = cena.add.container(0, 0).setScrollFactor(0).setDepth(profundidade);
    const estado = lerProgressoMissoes();
    const missoes = missoesDoDia();
    const estilo = (tamanho, cor, extra = {}) => ({
        resolution: 4, fontFamily: 'Arial', fontSize: tamanho + 'px', color: cor, ...extra
    });
    tela.add(cena.add.rectangle(180, altura / 2, 360 + 80, altura + 80, 0x1a0e08, 0.82).setScrollFactor(0).setInteractive());
    const meio = altura / 2;
    tela.add(cena.add.image(180, meio, texturaMadeira(cena, 328, 380, { raio: 20 })).setScale(1 / escalaMadeira));
    tela.add(cena.add.text(180, meio - 158, 'MISSÕES DE HOJE', {
        resolution: 4, fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '21px', fontStyle: 'bold',
        color: '#4d2710', stroke: '#f6c98f', strokeThickness: 3
    }).setOrigin(0.5));
    missoes.forEach((missao, i) => {
        const y = meio - 92 + i * 80;
        const feita = estado.feitas.includes(missao.id);
        const valor = Math.min(missao.meta, estado.progresso[missao.id] || 0);
        const linha = cena.add.container(180, y);
        linha.add(cena.add.graphics().fillStyle(0xfff4d6, 1).fillRoundedRect(-146, -32, 292, 66, 12)
            .lineStyle(2.5, feita ? 0x3f8a4c : 0x4d2710, 1).strokeRoundedRect(-146, -32, 292, 66, 12));
        linha.add(cena.add.text(-134, -18, missao.texto, estilo(13, '#4d2710', { fontStyle: 'bold', wordWrap: { width: 190 } }))
            .setOrigin(0, 0.5));
        // Barra de progresso.
        linha.add(cena.add.graphics().fillStyle(0xd9c2a8, 1).fillRoundedRect(-134, 10, 170, 12, 6)
            .fillStyle(feita ? 0x3f8a4c : 0xe39b3b, 1).fillRoundedRect(-134, 10, Math.max(12, 170 * valor / missao.meta), 12, 6));
        linha.add(cena.add.text(44, 16, `${valor}/${missao.meta}`, estilo(12, '#7a4a2a', { fontStyle: 'bold' })).setOrigin(0, 0.5));
        if (feita) {
            linha.add(cena.add.text(106, 0, 'Feita!', estilo(15, '#2f6b3a', { fontStyle: 'bold' })).setOrigin(0.5));
        } else {
            linha.add(cena.add.image(90, 0, 'moeda').setScale(22 / larguraGranulado));
            linha.add(cena.add.text(104, 1, '+' + missao.premio, estilo(15, '#4d2710', { fontStyle: 'bold' })).setOrigin(0, 0.5));
        }
        linha.setAlpha(0).setScale(0.9);
        cena.tweens.add({ targets: linha, alpha: 1, scale: 1, delay: 80 + i * 70, duration: 260, ease: 'Back.easeOut' });
        tela.add(linha);
    });
    tela.add(cena.add.text(180, meio + 150, 'Novas missões todo dia. O prêmio cai no cofrinho.',
        estilo(12, '#4d2710', { fontStyle: 'bold' })).setOrigin(0.5));
    tela.add(criarBotaoMadeira(cena, 180, meio + 222, 160, 46, 'FECHAR', () => {
        tela.destroy();
        aoFechar();
    }));
    tela.setAlpha(0);
    cena.tweens.add({ targets: tela, alpha: 1, duration: 160 });
    return tela;
}

// Imagem do resultado para compartilhar: o bicho escolhido, os troncos e os granulados.
function gerarCartaoResultado(cena) {
    const tela = document.createElement('canvas');
    tela.width = 1080;
    tela.height = 1350;
    const ctx = tela.getContext('2d');
    const arte = cena.textures.get('introducao').getSourceImage();
    const cobre = Math.max(1080 / arte.width, 1350 / arte.height);
    ctx.drawImage(arte, (1080 - arte.width * cobre) / 2, (1350 - arte.height * cobre) / 2, arte.width * cobre, arte.height * cobre);
    ctx.fillStyle = 'rgba(26, 14, 8, 0.45)';
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.drawImage(cena.textures.get(texturaMadeira(cena, 300, 390, { raio: 24 })).getSourceImage(), 90, 70, 900, 1170);
    const escrever = (texto, x, y, tamanho, cor = '#4d2710', contorno = '#f6c98f') => {
        ctx.font = `bold ${tamanho}px "Arial Black", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = tamanho / 7;
        ctx.strokeStyle = contorno;
        ctx.strokeText(texto, x, y);
        ctx.fillStyle = cor;
        ctx.fillText(texto, x, y);
    };
    escrever('GRANULANDO', 540, 175, 86);
    // Personagem com a pelagem (tinta multiplicada) e o acessorio, se for o gato.
    const loja = lerLoja();
    const pose = cena.textures.get(texturaPose(cena, 'mascote_1', loja)).getSourceImage();
    const figura = document.createElement('canvas');
    figura.width = pose.width;
    figura.height = pose.height;
    const fctx = figura.getContext('2d');
    fctx.drawImage(pose, 0, 0);
    const ehGato = loja.equipado.bichos === 'gato';
    const cor = ehGato ? itemEquipado(loja, 'pelagens').cor : 0xffffff;
    if (cor !== 0xffffff) {
        fctx.globalCompositeOperation = 'multiply';
        fctx.fillStyle = '#' + cor.toString(16).padStart(6, '0');
        fctx.fillRect(0, 0, figura.width, figura.height);
        fctx.globalCompositeOperation = 'destination-in';
        fctx.drawImage(pose, 0, 0);
    }
    const lado = 560;
    const xFigura = 540 - lado / 2;
    const yFigura = 180;
    ctx.drawImage(figura, xFigura, yFigura, lado, lado);
    const acessorio = itemEquipado(loja, 'acessorios').id;
    if (ehGato && acessorio !== 'nenhum') {
        const encaixe = encaixeAcessorio[acessorio];
        const cabeca = cabecaGato.mascote_1;
        const ponto = encaixe.ponto === 'centro'
            ? [(cabeca.topo[0] + cabeca.pescoco[0]) / 2, (cabeca.topo[1] + cabeca.pescoco[1]) / 2] : cabeca[encaixe.ponto];
        const imagem = cena.textures.get('ac_' + acessorio).getSourceImage();
        const largura = encaixe.largura * cabeca.largura / 2048 * lado;
        const alturaAc = largura * imagem.height / imagem.width;
        ctx.save();
        ctx.translate(xFigura + ponto[0] / 2048 * lado, yFigura + ponto[1] / 2048 * lado);
        ctx.rotate(Phaser.Math.DegToRad(cabeca.angulo));
        ctx.drawImage(imagem, -encaixe.origem[0] * largura, -encaixe.origem[1] * alturaAc, largura, alturaAc);
        ctx.restore();
    }
    // O trapaceiro sai de nariz de palhaco e com um carimbo na foto.
    const palhaco = temNariz();
    const narizCartao = palhaco && narizDaPose(texturaPose(cena, 'mascote_1', loja));
    if (narizCartao) {
        const ponto = narizCartao.ponto;
        const diametro = tamanhoNariz * narizCartao.largura / 2048 * lado / 27 * 30;
        ctx.drawImage(cena.textures.get('ac_palhaco').getSourceImage(), xFigura + ponto[0] / 2048 * lado - diametro / 2,
            yFigura + ponto[1] / 2048 * lado - diametro / 2, diametro, diametro);
    }
    if (palhaco) {
        ctx.save();
        ctx.translate(785, 585);
        ctx.rotate(-0.2);
        ctx.fillStyle = '#d9452f';
        ctx.strokeStyle = '#fff4d6';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.roundRect(-175, -46, 350, 92, 16);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold 44px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('TRAPACEIRO', 0, 4);
        ctx.restore();
    }
    // Pergaminho com os numeros da partida.
    ctx.fillStyle = '#fff4d6';
    ctx.strokeStyle = '#4d2710';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(170, 700, 740, 330, 36);
    ctx.fill();
    ctx.stroke();
    escrever(`${cena.contador} ${cena.contador === 1 ? 'tronco' : 'troncos'}`, 540, 790, 92, '#4d2710', '#fff4d6');
    const granulado = cena.textures.get('moeda').getSourceImage();
    const textoGranulados = String(cena.totalMoedas);
    ctx.font = 'bold 92px "Arial Black", Arial, sans-serif';
    const larguraTexto = ctx.measureText(textoGranulados).width;
    const inicio = 540 - (150 + 24 + larguraTexto) / 2;
    ctx.drawImage(granulado, inicio, 900 - 46, 150, 150 * granulado.height / granulado.width);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4d2710';
    ctx.textBaseline = 'middle';
    ctx.fillText(textoGranulados, inicio + 174, 912);
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7a4a2a';
    ctx.fillText('granulados', 540, 985);
    if (palhaco) {
        escrever('Tentei trapacear e', 540, 1108, 54);
        escrever('o guaxinim me pegou!', 540, 1170, 54);
    } else {
        escrever('Consegue me passar?', 540, 1140, 62);
    }
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.fillStyle = '#fff4d6';
    ctx.fillText('Casspet® - Granulando', 540, 1282);
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText(enderecoJogo.replace('https://', ''), 540, 1322);
    return new Promise((resolver) => tela.toBlob((blob) =>
        resolver(blob ? new File([blob], 'granulando.png', { type: 'image/png' }) : null), 'image/png'));
}

// Abre o compartilhamento do celular com a imagem; sem ele, compartilha so o texto ou copia o link.
async function compartilharResultado(cena, arquivo) {
    const texto = temNariz()
        ? 'Tentei trapacear no Granulando e o guaxinim me pegou 🤡 Vem jogar limpo:'
        : `Subi ${contar(cena.contador, 'tronco')} e peguei ${contar(cena.totalMoedas, 'granulado')} no Granulando! Consegue me passar?`;
    try {
        if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            await navigator.share({ files: [arquivo], text: `${texto} ${enderecoJogo}` });
            return 'compartilhado';
        }
        if (navigator.share) {
            await navigator.share({ text: texto, url: enderecoJogo });
            return 'compartilhado';
        }
    } catch (erro) {
        if (erro && erro.name === 'AbortError') return 'cancelado';
    }
    try {
        await navigator.clipboard.writeText(`${texto} ${enderecoJogo}`);
        return 'copiado';
    } catch (erro) {
        return 'falhou';
    }
}

// Volta para a tela de titulo, de onde se chega a loja.
function voltarAoMenu(cena) {
    musica.parar(0.05);
    cena.tweens.resumeAll();
    cena.physics.resume();
    // Sem esse aviso, o Phaser repete os dados do ultimo reinicio: depois de um JOGAR DE NOVO,
    // o MENU iria direto para a historinha.
    cena.scene.restart({ reiniciar: false });
}

// Tela da loja: cofrinho, abas e cartoes com os itens, no estilo das placas de madeira do
// menu. Devolve o container, que se destroi ao voltar.
function mostrarLoja(cena, aoFechar, profundidade = 30) {
    const loja = lerLoja();
    cena.loja = loja;
    const altura = config.height;
    const tela = cena.add.container(0, 0).setScrollFactor(0).setDepth(profundidade);
    const fixo = (objeto) => {
        tela.add(objeto);
        return objeto;
    };
    const estilo = (tamanho, cor, extra = {}) => ({
        resolution: 4, fontFamily: 'Arial', fontSize: tamanho + 'px', color: cor, ...extra
    });
    const estiloPlaca = (tamanho) => ({
        resolution: 4, fontFamily: 'Arial Black, Arial, sans-serif', fontSize: tamanho + 'px', fontStyle: 'bold',
        color: '#4d2710', stroke: '#f6c98f', strokeThickness: 3
    });
    // Fundo: a floresta do menu escurecida. Tambem bloqueia os toques no que esta por baixo.
    const escalaArte = Math.max(config.width / 941, altura / 1672);
    fixo(cena.add.image(180, altura / 2, 'introducao', '__BASE').setScale(escalaArte));
    fixo(cena.add.rectangle(180, altura / 2, 360 + 80, altura + 80, 0x1a0e08, 0.9).setScrollFactor(0).setInteractive());

    // Placa do titulo pendurada por duas cordas, balancando de leve.
    const cordas = fixo(cena.add.graphics());
    cordas.lineStyle(4, 0xc99a5b).lineBetween(118, -10, 118, 24).lineBetween(242, -10, 242, 24);
    const placa = fixo(cena.add.container(180, 42, [
        cena.add.image(0, 0, texturaMadeira(cena, 190, 54, { raio: 14 })).setScale(1 / escalaMadeira),
        cena.add.text(0, 1, 'LOJA', estiloPlaca(28)).setOrigin(0.5)
    ]));
    cena.tweens.add({ targets: placa, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Cofrinho num pergaminho.
    const fundoSaldo = fixo(cena.add.graphics());
    const iconeSaldo = fixo(cena.add.image(0, 90, 'moeda').setScale(22 / larguraGranulado));
    const textoSaldo = fixo(cena.add.text(0, 91, '', estilo(15, '#4d2710', { fontStyle: 'bold' })).setOrigin(0, 0.5));
    const atualizarSaldo = () => {
        textoSaldo.setText(contar(loja.saldo, 'granulado'));
        const largura = 22 + 8 + textoSaldo.width + 28;
        const inicio = 180 - largura / 2;
        iconeSaldo.x = inicio + 25;
        textoSaldo.x = inicio + 42;
        fundoSaldo.clear().fillStyle(0xfff4d6, 1).fillRoundedRect(inicio, 76, largura, 29, 14)
            .lineStyle(2.5, 0x4d2710, 1).strokeRoundedRect(inicio, 76, largura, 29, 14);
    };
    atualizarSaldo();
    const pularSaldo = () => {
        cena.tweens.killTweensOf([iconeSaldo, textoSaldo]);
        iconeSaldo.setScale(22 / larguraGranulado * 1.4);
        cena.tweens.add({ targets: iconeSaldo, scale: 22 / larguraGranulado, duration: 350, ease: 'Back.easeOut' });
    };

    const abas = [['bichos', 'Bichos'], ['pelagens', 'Pelagens'], ['acessorios', 'Acessórios']];
    let abaAtual = 'bichos';
    const botoesAbas = abas.map(([grupo, nome], i) => {
        const x = 64 + i * 116;
        const fundo = cena.add.image(0, 0, texturaMadeira(cena, 110, 36, { raio: 10 })).setScale(1 / escalaMadeira);
        const texto = cena.add.text(0, 1, nome, estiloPlaca(13)).setOrigin(0.5);
        const aba = fixo(cena.add.container(x, 132, [fundo, texto]).setSize(110, 36).setScrollFactor(0)
            .setInteractive({ useHandCursor: true }));
        aba.on('pointerdown', () => {
            if (abaAtual === grupo) return;
            som.clique();
            abaAtual = grupo;
            desenharCartoes();
        });
        return { grupo, aba, fundo };
    });

    let cartoes = null;
    const aviso = fixo(cena.add.text(180, altura - 78, '', estilo(13, '#ffd24a', {
        fontStyle: 'bold', stroke: '#1a0e08', strokeThickness: 4
    })).setOrigin(0.5));
    const avisar = (texto) => {
        cena.tweens.killTweensOf(aviso);
        aviso.setText(texto).setAlpha(1).setScale(0.8);
        cena.tweens.add({ targets: aviso, scale: 1, duration: 220, ease: 'Back.easeOut' });
        cena.tweens.add({ targets: aviso, alpha: 0, delay: 1500, duration: 400 });
    };
    // Chuva de granulados saindo do cartao comprado.
    const comemorar = (x, y) => {
        for (let i = 0; i < 12; i++) {
            const granulado = cena.add.image(x, y, 'moeda').setScale(20 / larguraGranulado).setAngle(Phaser.Math.Between(0, 360));
            tela.add(granulado);
            const angulo = Phaser.Math.DegToRad(Phaser.Math.Between(200, 340));
            const alcance = Phaser.Math.Between(40, 90);
            cena.tweens.add({
                targets: granulado, x: x + Math.cos(angulo) * alcance, y: y + Math.sin(angulo) * alcance,
                angle: '+=' + Phaser.Math.Between(180, 540), duration: 420, ease: 'Quad.easeOut',
                onComplete: () => cena.tweens.add({
                    targets: granulado, y: granulado.y + 60, alpha: 0, duration: 380, ease: 'Quad.easeIn',
                    onComplete: () => granulado.destroy()
                })
            });
        }
    };
    const escolher = (grupo, item, x, y) => {
        if (item.emBreve) {
            som.clique();
            avisar('Esse bicho chega em breve!');
            return;
        }
        const tem = item.preco === 0 || loja.comprados.includes(item.id);
        if (!tem) {
            if (loja.saldo < item.preco) {
                som.clique();
                avisar(`Faltam ${contar(item.preco - loja.saldo, 'granulado')}`);
                return;
            }
            loja.saldo -= item.preco;
            loja.comprados.push(item.id);
            som.dourado();
            avisar(`${item.nome}: comprado!`);
            atualizarSaldo();
            pularSaldo();
            comemorar(x, y);
        } else {
            som.clique();
        }
        loja.equipado[grupo] = item.id;
        salvarLoja(loja);
        if (grupo === 'bichos') {
            cena.caixa.setTexture(texturaPose(cena, 'mascote_1', loja)).setDisplaySize(78, 80);
            cena.gato.setTexture(cena.caixa.texture.key);
        }
        vestirGato(cena, cena.gato, loja);
        desenharCartoes(item.id);
    };
    const desenharCartoes = (destaque = null) => {
        const primeiraVez = !cartoes;
        if (cartoes) cartoes.destroy();
        cartoes = cena.add.container(0, 0);
        tela.addAt(cartoes, tela.list.indexOf(aviso));
        botoesAbas.forEach(({ grupo, aba, fundo }) => {
            const ativa = grupo === abaAtual;
            fundo.setTint(ativa ? 0xffffff : 0x9c8068);
            cena.tweens.killTweensOf(aba);
            cena.tweens.add({ targets: aba, y: ativa ? 128 : 134, scale: ativa ? 1.06 : 0.96, duration: 180, ease: 'Back.easeOut' });
        });
        const itens = itensLoja[abaAtual];
        if (abaAtual !== 'bichos' && loja.equipado.bichos !== 'gato') {
            cartoes.add(cena.add.text(180, altura - 100, 'Pelagens e acessórios aparecem só no gato.',
                estilo(12, '#f4ddc9', { stroke: '#1a0e08', strokeThickness: 3 })).setOrigin(0.5));
        }
        const topo = 158;
        const alturaCartao = Math.floor(Math.min(150, (altura - 104 - topo - 16) / 3));
        itens.forEach((item, i) => {
            const x = i % 2 === 0 ? 94 : 266;
            const y = topo + Math.floor(i / 2) * (alturaCartao + 8) + alturaCartao / 2;
            const usando = loja.equipado[abaAtual] === item.id;
            const tem = item.preco === 0 || loja.comprados.includes(item.id);
            const cartao = cena.add.container(x, y);
            cartoes.add(cartao);
            const fundo = cena.add.image(0, 0, texturaMadeira(cena, 164, alturaCartao, {
                raio: 14, escurecer: item.emBreve ? 0.55 : 0.28, borda: usando ? 0xffc629 : 0x4d2710
            })).setScale(1 / escalaMadeira);
            fundo.setSize(164, alturaCartao);
            cartao.add(fundo);
            cartao.setSize(164, alturaCartao).setScrollFactor(0).setInteractive({ useHandCursor: true });
            cartao.on('pointerdown', () => escolher(abaAtual, item, x, y));
            // Vitrine clara atras da figura.
            const yVitrine = -alturaCartao * 0.15;
            cartao.add(cena.add.ellipse(0, yVitrine, 92, alturaCartao * 0.46, 0xfff4d6, item.emBreve ? 0.18 : 0.9)
                .setStrokeStyle(2, 0x4d2710, 0.6));
            if (item.emBreve) {
                cartao.add(cena.add.text(0, yVitrine, '?', estiloPlaca(30)).setOrigin(0.5).setAlpha(0.8));
            } else {
                const provador = { ...loja, equipado: { ...loja.equipado, [abaAtual]: item.id } };
                // Pelagens e acessorios aparecem no gato, mesmo com outro bicho escolhido.
                if (abaAtual !== 'bichos') provador.equipado.bichos = 'gato';
                // Os pes ficam a 84% da altura da imagem; na aba de bichos a figura e menor,
                // porque as orelhas do coelho sao mais altas.
                const figura = cena.add.image(0, alturaCartao * 0.07, texturaPose(cena, 'mascote_1', provador))
                    .setOrigin(0.5, 0.84).setScale(alturaCartao * (abaAtual === 'bichos' ? 0.74 : 0.84) / tamanhoPose);
                vestirGato(cena, figura, provador);
                cartao.add(figura);
                if (figura.acessorio) cartao.add(figura.acessorio);
                // O item em uso respira devagar.
                if (usando) {
                    cena.tweens.add({ targets: [figura, figura.acessorio].filter(Boolean), scaleY: '*=1.04', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                }
            }
            cartao.add(cena.add.text(0, alturaCartao * 0.2, item.nome, estilo(item.nome.length > 14 ? 11 : 13, '#fff4d6', {
                fontStyle: 'bold', stroke: '#2a1410', strokeThickness: 3
            })).setOrigin(0.5));
            const yBotao = alturaCartao / 2 - 17;
            const [corBotao, corTextoBotao] = item.emBreve ? [0x5c4636, '#d9c2a8']
                : usando ? [0x3f8a4c, '#ffffff'] : tem ? [0xfff4d6, '#4d2710'] : [0xffd24a, '#4d2710'];
            cartao.add(cena.add.graphics().fillStyle(corBotao, 1).fillRoundedRect(-58, yBotao - 12, 116, 24, 12)
                .lineStyle(2, 0x2a1410, 1).strokeRoundedRect(-58, yBotao - 12, 116, 24, 12));
            const rotulo = item.emBreve ? 'Em breve' : usando ? 'Usando' : tem ? 'Usar' : String(item.preco);
            const texto = cena.add.text(0, yBotao + 1, rotulo, estilo(13, corTextoBotao, { fontStyle: 'bold' })).setOrigin(0.5);
            if (!tem && !item.emBreve) {
                texto.x = 9;
                cartao.add(cena.add.image(texto.x - texto.width / 2 - 13, yBotao, 'moeda').setScale(18 / larguraGranulado));
            }
            cartao.add(texto);
            // Os cartoes entram em sequencia; o escolhido agora da um pulo.
            if (item.id === destaque) {
                cartao.setScale(1.08);
                cena.tweens.add({ targets: cartao, scale: 1, duration: 420, ease: 'Elastic.easeOut', easeParams: [1, 0.5] });
            } else if (!destaque) {
                cartao.setAlpha(0).setScale(0.86);
                cena.tweens.add({ targets: cartao, alpha: 1, scale: 1, delay: i * 45 + (primeiraVez ? 120 : 0), duration: 260, ease: 'Back.easeOut' });
            }
        });
    };
    desenharCartoes();

    fixo(criarBotaoMadeira(cena, 180, altura - 38, 170, 46, 'VOLTAR', () => {
        tela.destroy();
        aoFechar();
    }));
    tela.setAlpha(0);
    cena.tweens.add({ targets: tela, alpha: 1, duration: 180 });
    return tela;
}

// Textura de uma pose do gato, ou a mesma pose do bicho escolhido na loja.
function texturaPose(cena, pose, loja = cena.loja) {
    const bicho = loja && loja.equipado.bichos;
    if (!bicho || bicho === 'gato') return pose;
    return bicho + '_' + (posesBicho[pose] ? pose : 'caindo');
}

// Aplica a pelagem e o acessorio escolhidos na loja a uma imagem do gato.
function vestirGato(cena, gato, loja = cena.loja) {
    if (gato.acessorio) gato.acessorio.destroy();
    gato.acessorio = null;
    if (gato.nariz) gato.nariz.destroy();
    gato.nariz = null;
    // O nariz de palhaco do trapaceiro vale para qualquer bicho (so no da partida, nao nas vitrines).
    if (gato === cena.gato && temNariz()) criarNariz(cena, gato);
    // Pelagens e acessorios sao feitos para o gato; os outros bichos ficam como sao.
    if (loja.equipado.bichos !== 'gato') {
        gato.clearTint();
        return;
    }
    gato.setTint(itemEquipado(loja, 'pelagens').cor);
    const acessorio = itemEquipado(loja, 'acessorios').id;
    if (acessorio === 'nenhum') return;
    const encaixe = encaixeAcessorio[acessorio];
    gato.acessorio = cena.add.image(0, 0, 'ac_' + acessorio)
        .setOrigin(encaixe.origem[0], encaixe.origem[1])
        .setDepth(gato.depth + 0.1).setScrollFactor(gato.scrollFactorX, gato.scrollFactorY);
    gato.acessorio.encaixe = encaixe;
    gato.once('destroy', () => gato.acessorio && gato.acessorio.destroy());
    posicionarAcessorio(gato);
}

// Confere a cada quadro o que um jogo honesto nunca faz: gravidade mexida, subida mais rapida que o
// super pulo, placar alterado por fora ou altura demais em 10 s de relogio de verdade. Os limites tem
// folga de sobra para o granulado dourado e a mola; o relogio do jogo nunca anda mais rapido que o real.
function vigiarPartida(cena) {
    // Na previa do cenario o botao SUBIR voa de proposito.
    if (cena.trapaca || previaCenario) return;
    const velocidade = cena.velocidadeJogo;
    const vigia = cena.vigia;
    let motivo = null;
    if (Math.abs(cena.physics.world.gravity.y - gravidadeBase * velocidade ** 2) > 1) motivo = 'gravidade';
    else if (cena.caixa.body.velocity.y < -(650 * velocidade + 80)) motivo = 'velocidade';
    else if (cena.totalMoedas !== vigia.moedas || cena.contador !== vigia.troncos) motivo = 'placar';
    else {
        const agora = performance.now();
        const amostras = vigia.amostras;
        if (!amostras.length || agora - amostras[amostras.length - 1][0] >= 250) amostras.push([agora, cena.alturaMax]);
        while (agora - amostras[0][0] > 10000) amostras.shift();
        if (cena.alturaMax - amostras[0][1] > 2600 * velocidade) motivo = 'altura';
    }
    if (motivo) detectarTrapaca(cena, motivo);
}

// Deixa o hack "funcionar" um pouquinho antes de o guaxinim aparecer. O recorde guardado ja vai a zero.
function detectarTrapaca(cena, motivo) {
    if (cena.trapaca || cena.morreu) return;
    cena.trapaca = { motivo, espera: 2.2, pego: false };
    cena.nariz = true;
    marcarTrapaceiro();
    cena.recorde = { granulados: 0, troncos: 0, altura: 0 };
    salvarRecorde(cena.recorde);
}

// A peca: o guaxinim chega voando, ri da cara do trapaceiro, poe um nariz de palhaco nele, leva todos os
// granulados e troncos do placar e vai embora. Depois o gato cai e a partida acaba sem recorde.
function pregarPeca(cena) {
    cena.trapaca.pego = true;
    cena.pegandoTrapaceiro = true;
    cena.physics.pause();
    musica.parar(0.1);
    if (cena.maoTutorial) fecharMaoTutorial(cena);
    const caixa = cena.caixa;
    const camera = cena.cameras.main;
    // Fica do lado com mais espaco, olhando para o gato (a arte olha para a direita).
    const lado = caixa.x > 180 ? -1 : 1;
    const guaxinim = cena.guaxinim;
    guaxinim.visual.setVisible(false);
    if (guaxinim.dica) guaxinim.dica.setVisible(false);
    const figura = cena.add.image(0, 0, 'guaxinim_rindo').setOrigin(0.5, 0.98);
    figura.setScale(74 / figura.width);
    const saco = cena.add.image(21, -24, 'fx_saco').setScale(0.58).setAngle(14);
    const ladrao = cena.add.container(caixa.x + lado * 95, camera.scrollY - 90, [figura, saco]).setDepth(6);
    ladrao.scaleX = -lado;
    som.risada();
    camera.shake(200, 0.006);
    cena.tweens.add({ targets: ladrao, y: caixa.y + 34, duration: 650, ease: 'Back.easeOut' });
    cena.tweens.add({ targets: figura, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: -1 });
    const passos = [
        [700, () => {
            balaoFala(cena, ladrao, 'HAHAHA! Achou que ia me passar voando?', 2300);
            som.risada();
        }],
        [1500, () => colocarNarizPalhaco(cena)],
        [2400, () => roubarPlacar(cena, ladrao)],
        [4300, () => {
            balaoFala(cena, ladrao, 'Valeu pelos granulados, trapaceiro!', 2000);
            som.risada();
        }],
        [6300, () => {
            som.risada();
            cena.tweens.add({
                targets: ladrao, y: cena.cameras.main.scrollY - 140, x: ladrao.x + lado * 40, duration: 700,
                ease: 'Quad.easeIn', onComplete: () => ladrao.destroy()
            });
        }],
        [6900, () => soltarTrapaceiro(cena)]
    ];
    passos.forEach(([espera, acao]) => cena.time.delayedCall(espera, acao));
}

// Balao de fala acima de quem fala, sem sair da tela.
function balaoFala(cena, alvo, texto, duracao) {
    const rotulo = cena.add.text(0, 0, texto, {
        resolution: 4, fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#2a1410',
        align: 'center', wordWrap: { width: 190 }
    }).setOrigin(0.5);
    const largura = rotulo.width + 22;
    const altura = rotulo.height + 16;
    const x = Phaser.Math.Clamp(alvo.x, largura / 2 + 8, config.width - largura / 2 - 8);
    const bico = Phaser.Math.Clamp(alvo.x - x, -largura / 2 + 16, largura / 2 - 16);
    const fundo = cena.add.graphics();
    fundo.fillStyle(0x2a1410, 1).fillRoundedRect(-largura / 2 - 2.5, -altura / 2 - 2.5, largura + 5, altura + 5, 12)
        .fillTriangle(bico - 9, altura / 2, bico + 9, altura / 2, bico, altura / 2 + 14);
    fundo.fillStyle(0xfff4d6, 1).fillRoundedRect(-largura / 2, -altura / 2, largura, altura, 10)
        .fillTriangle(bico - 6, altura / 2 - 1, bico + 6, altura / 2 - 1, bico, altura / 2 + 9);
    const balao = cena.add.container(x, alvo.y - 96 - altura / 2, [fundo, rotulo]).setDepth(9).setScale(0.3);
    cena.tweens.add({ targets: balao, scale: 1, duration: 260, ease: 'Back.easeOut' });
    cena.tweens.add({
        targets: balao, alpha: 0, delay: duracao, duration: 250, onComplete: () => balao.destroy()
    });
}

function colocarNarizPalhaco(cena) {
    som.buzina();
    const gato = cena.gato;
    mostrarPopup(cena, gato.x, gato.y - 96, 'FON FON!', '#ff6b6b', 18);
    if (gato.nariz) return;
    criarNariz(cena, gato);
    gato.nariz.escalaExtra = 0;
    cena.tweens.add({ targets: gato.nariz, escalaExtra: 1, duration: 450, ease: 'Back.easeOut', easeParams: [3] });
}

// Os granulados saem da placa e voam para o pacote do guaxinim; troncos e granulados descem a zero.
function roubarPlacar(cena, ladrao) {
    const moedas = cena.totalMoedas;
    const troncos = cena.contador;
    cena.combo.seguidos = 0;
    cena.combo.vale = 1;
    atualizarCombo(cena, false);
    cena.tweens.addCounter({
        from: 1, to: 0, duration: 1700, ease: 'Sine.easeIn',
        onUpdate: (contagem) => {
            cena.totalMoedas = Math.round(moedas * contagem.getValue());
            cena.contador = Math.round(troncos * contagem.getValue());
            atualizarHud(cena);
        }
    });
    const hud = cena.hud;
    for (let i = 0; i < 14; i++) {
        cena.time.delayedCall(i * 110, () => {
            const camera = cena.cameras.main;
            const inicioX = hud.granulados.x + hud.icone.x;
            const inicioY = hud.granulados.y + camera.scrollY;
            const alvoX = ladrao.x + ladrao.scaleX * 21;
            const alvoY = ladrao.y - 24;
            const grao = cena.add.image(inicioX, inicioY, 'moeda').setScale(22 / larguraGranulado).setDepth(7);
            pulsarHud(cena, hud.granulados);
            som.roubo(i);
            cena.tweens.addCounter({
                from: 0, to: 1, duration: 520, ease: 'Quad.easeIn',
                onUpdate: (contagem) => {
                    const t = contagem.getValue();
                    grao.setPosition(Phaser.Math.Linear(inicioX, alvoX, t),
                        Phaser.Math.Linear(inicioY, alvoY, t) - 60 * 4 * t * (1 - t)).setAngle(t * 400);
                },
                onComplete: () => grao.destroy()
            });
        });
    }
}

// Fim da peca: o gato despenca atravessando os troncos e a derrota aparece sozinha.
function soltarTrapaceiro(cena) {
    if (cena.morreu) return;
    cena.pegandoTrapaceiro = false;
    const caixa = cena.caixa;
    caixa.quedaSemVolta = true;
    caixa.body.setVelocity(0, 0);
    caixa.setTexture(texturaPose(cena, 'caindo')).setDisplaySize(78, 80);
    cena.physics.resume();
}

// Partida limpa ate troncosPerdao: o guaxinim devolve o nariz.
function devolverNariz(cena) {
    cena.nariz = false;
    salvarArmazenado(chavePerfil, {});
    const nariz = cena.gato.nariz;
    if (nariz) {
        cena.gato.nariz = null;
        cena.tweens.add({
            targets: nariz, y: nariz.y - 90, angle: 540, alpha: 0, duration: 800, ease: 'Quad.easeOut',
            onComplete: () => nariz.destroy()
        });
    }
    mostrarFaixa(cena, 'NARIZ DEVOLVIDO!', 'Jogou limpo: o guaxinim te perdoou', '#ffd24a');
    som.recorde();
}

// Nariz de palhaco preso na cara do gato, um pouco abaixo do meio dos olhos.
function criarNariz(cena, gato) {
    if (gato.nariz) return;
    gato.nariz = cena.add.image(0, 0, 'ac_palhaco').setDepth(gato.depth + 0.2)
        .setScrollFactor(gato.scrollFactorX, gato.scrollFactorY);
    gato.nariz.escalaExtra = 1;
    gato.once('destroy', () => gato.nariz && gato.nariz.destroy());
    posicionarNariz(gato);
}

// Onde fica o nariz em cada pose: no gato, um pouco abaixo do meio dos olhos; nos outros bichos, no focinho.
function narizDaPose(chave) {
    if (narizBichos[chave]) return narizBichos[chave];
    const cabeca = cabecaGato[chave];
    if (!cabeca) return null;
    const giro = Phaser.Math.DegToRad(cabeca.angulo);
    const abaixo = cabeca.largura * 0.09;
    return {
        ponto: [cabeca.olhos[0] - abaixo * Math.sin(giro), cabeca.olhos[1] + abaixo * Math.cos(giro)],
        largura: cabeca.largura
    };
}

function posicionarNariz(gato) {
    const nariz = gato.nariz;
    if (!nariz) return;
    const pose = narizDaPose(gato.texture.key);
    if (!pose) {
        nariz.setVisible(false);
        return;
    }
    const posicao = pontoNaTela(gato, pose.ponto);
    const k = gato.frame.width / 2048;
    // A textura tem 90 px para uma bolinha de 27; o nariz fica com tamanhoNariz da largura da cabeca.
    const escala = tamanhoNariz * pose.largura * k * Math.abs(gato.scaleX) / 81 * nariz.escalaExtra;
    nariz.setPosition(posicao.x, posicao.y).setScale(escala).setAlpha(gato.alpha).setVisible(gato.visible);
}

// Converte um ponto da grade de 2048 da pose para a tela, seguindo espelhamento, achatamento e inclinacao.
function pontoNaTela(gato, ponto) {
    const k = gato.frame.width / 2048;
    const localX = ((gato.flipX ? 2048 - ponto[0] : ponto[0]) - 2048 * gato.originX) * k * Math.abs(gato.scaleX);
    const localY = (ponto[1] - 2048 * gato.originY) * k * gato.scaleY;
    const giro = Phaser.Math.DegToRad(gato.angle);
    return {
        x: gato.x + localX * Math.cos(giro) - localY * Math.sin(giro),
        y: gato.y + localX * Math.sin(giro) + localY * Math.cos(giro)
    };
}

// Prende o acessorio na cabeca, seguindo pose, espelhamento, achatamento e inclinacao.
function posicionarAcessorio(gato) {
    const acessorio = gato.acessorio;
    if (!acessorio) return;
    const cabeca = cabecaGato[gato.texture.key] || cabecaGato.mascote_1;
    const encaixe = acessorio.encaixe;
    const ponto = encaixe.ponto === 'centro'
        ? [(cabeca.topo[0] + cabeca.pescoco[0]) / 2, (cabeca.topo[1] + cabeca.pescoco[1]) / 2]
        : cabeca[encaixe.ponto];
    const espelhado = gato.flipX;
    // cabecaGato usa uma grade de 2048; k converte para os pixels da textura atual.
    const k = gato.frame.width / 2048;
    const posicao = pontoNaTela(gato, ponto);
    acessorio.setPosition(posicao.x, posicao.y);
    const escala = encaixe.largura * cabeca.largura * k * Math.abs(gato.scaleX) / acessorio.frame.width;
    acessorio.setScale(escala, escala * gato.scaleY / Math.abs(gato.scaleX))
        .setFlipX(espelhado).setAngle(gato.angle + (espelhado ? -cabeca.angulo : cabeca.angulo))
        .setAlpha(gato.alpha).setVisible(gato.visible);
}

// Achata ou estica o gato e volta ao normal com um balanco elastico.
function deformarGato(cena, x, y, duracao) {
    const deformacao = cena.deformacao;
    cena.tweens.killTweensOf(deformacao);
    deformacao.x = x;
    deformacao.y = y;
    cena.tweens.add({
        targets: deformacao, x: 1, y: 1,
        duration: duracao / cena.velocidadeJogo,
        ease: 'Elastic.easeOut', easeParams: [1, 0.45]
    });
}

function sincronizarGato(cena, delta) {
    const corpo = cena.caixa;
    const gato = cena.gato;
    if (gato.texture.key !== corpo.texture.key) gato.setTexture(corpo.texture.key);
    // A imagem fica presa pelos pes, entao o achatamento nao tira o gato do tronco.
    gato.setPosition(corpo.x, corpo.y + corpo.displayHeight / 2);
    gato.setFlipX(corpo.flipX);
    gato.setScale(78 / gato.frame.width * cena.deformacao.x,
        80 / gato.frame.height * cena.deformacao.y);
    posicionarAcessorio(gato);
    posicionarNariz(gato);
    // A sombra no gramado encolhe e some conforme o gato sobe.
    if (cena.sombraGato) {
        const pertoDoChao = Phaser.Math.Clamp(1 - (alturaChao - gato.y) / 170, 0, 1);
        cena.sombraGato.setPosition(corpo.x, alturaChao - 1)
            .setScale(0.5 + 0.5 * pertoDoChao, 1).setAlpha(0.3 * pertoDoChao);
    }
    // Inclina levemente na direcao do movimento lateral.
    const velocidadeX = corpo.body ? corpo.body.velocity.x : 0;
    const inclinacao = velocidadeX / (200 * cena.velocidadeJogo) * 7;
    gato.angle += (inclinacao - gato.angle) * (1 - Math.exp(-12 * delta / 1000));

    const agora = cena.time.now;
    if (corpo.turboAte > agora && !cena.pausado && !cena.morreu &&
        agora >= (cena.proximoRastro || 0)) {
        cena.proximoRastro = agora + 45;
        const rastro = cena.add.image(gato.x, gato.y, gato.texture.key)
            .setOrigin(0.5, 1).setScale(gato.scaleX, gato.scaleY)
            .setFlipX(gato.flipX).setAngle(gato.angle)
            .setTintFill(0xffd24a).setAlpha(0.4).setDepth(4);
        cena.tweens.add({
            targets: rastro, alpha: 0, duration: 280, onComplete: () => rastro.destroy()
        });
    }
}

// O tronco rachado se parte em duas metades que caem girando.
function quebrarTronco(cena, plataforma) {
    const meiaLargura = plataforma.frame.width / 2;
    [-1, 1].forEach((lado) => {
        const pedaco = cena.add.image(plataforma.x + lado * plataforma.displayWidth / 4,
            plataforma.y, plataforma.texture.key)
            .setOrigin(lado < 0 ? 0.25 : 0.75, 0.5)
            .setScale(plataforma.scaleX, plataforma.scaleY)
            .setCrop(lado < 0 ? 0 : meiaLargura, 0, meiaLargura, plataforma.frame.height)
            .setDepth(1);
        cena.tweens.add({
            targets: pedaco, x: pedaco.x + lado * 26, y: pedaco.y + 190,
            angle: lado * 60, alpha: 0, duration: 650, ease: 'Quad.easeIn',
            onComplete: () => pedaco.destroy()
        });
    });
    cena.efeitos.lascas.explode(12, plataforma.x, plataforma.y);
    som.quebra();
    plataforma.destroy();
}

function pular(caixa, plataforma) {
    const cena = caixa.scene;
    cena.ultimoTronco = Math.max(cena.ultimoTronco, plataforma.numero);
    // Cada tronco conta uma unica vez; o chao nao entra na contagem.
    if (plataforma.numero > 0 && !plataforma.contada) {
        // Granulado de um tronco ja pisado que ficou para tras quebra a sequencia.
        // Os de troncos pulados por um super pulo ou pela mola nao contam.
        for (const moeda of cena.moedas.getChildren()) {
            if (moeda.coletada || moeda.perdida || moeda.escondida || moeda.atraida) continue;
            if (moeda.plataforma.contada && moeda.plataforma.numero < plataforma.numero) {
                moeda.perdida = true;
                quebrarCombo(cena);
            }
        }
        plataforma.contada = true;
        cena.contador += 1;
        cena.vigia.troncos += 1;
        if (cena.nariz && !cena.trapaca && cena.contador >= troncosPerdao) devolverNariz(cena);
        registrarMissao(cena, 'troncos', cena.contador);
        if (cena.bicadas === 0) registrarMissao(cena, 'semBicada', cena.contador);
        atualizarHud(cena);
        if (cena.contador % 20 === 0) {
            cena.plataformas.getChildren().forEach(function (tronco) {
                ajustarLarguraTronco(cena, tronco);
            });
            const proxima = 1 + cena.contador / 20 * 0.25;
            if (proxima <= velocidadeMaxima) {
                mostrarFaixa(cena,
                    proxima === velocidadeMaxima ? 'VELOCIDADE MÁXIMA!' : 'MAIS RÁPIDO!',
                    'Nível ' + (cena.contador / 20 + 1));
                som.nivel();
            }
        }
    }
    // Acelera 25% da velocidade inicial a cada 20 troncos alcancados, ate o limite.
    const velocidade = Math.min(velocidadeMaxima, 1 + Math.floor(cena.contador / 20) * 0.25);
    cena.velocidadeJogo = velocidade;
    musica.definirVelocidade(velocidade);
    // Gravidade proporcional ao quadrado preserva a altura e o alcance do salto.
    cena.physics.world.gravity.y = gravidadeBase * velocidade ** 2;
    // A pose de contato acompanha o ritmo do jogo.
    caixa.setTexture(texturaPose(cena, 'quasePulando')).setDisplaySize(78, 80);
    caixa.poseContatoAte = cena.time.now + 120 / velocidade;
    // Garante o impulso mesmo quando a plataforma quebra.
    caixa.body.setVelocityY(-400 * velocidade);
    if (plataforma.mola) {
        pularNaMola(cena, plataforma);
        return;
    }
    som.pulo();
    if (plataforma.numero === 0) cena.efeitos.grama.explode(8, caixa.x, caixa.y + 38);
    else cena.efeitos.poeira.explode(7, caixa.x, caixa.y + 36);
    deformarGato(cena, 1.3, 0.72, 420);
    if (plataforma.fragil) {
        quebrarTronco(cena, plataforma);
    } else if (plataforma.movimento && plataforma.movimento.tipo === 'balanco') {
        reagirBalanco(cena, plataforma);
    } else if (plataforma.numero > 0) {
        // O tronco cede um pouco com o peso; o corpo de colisao fica parado.
        cena.tweens.add({
            targets: plataforma, y: plataforma.y + 5, duration: 70,
            yoyo: true, ease: 'Quad.easeOut'
        });
    }
}

function update(time, delta) {
    if (!this.iniciado || this.morreu || this.pausado || this.pegandoTrapaceiro) return;
    atualizarPlataformasMoveis(this, delta);
    atualizarGuaxinim(this, delta);
    atualizarPassaros(this, delta);
    atualizarVidaFundo(this, delta);
    if (this.caixa.y - this.caixa.displayHeight / 2 >
        this.cameras.main.scrollY + config.height) {
        mostrarMorte(this);
        return;
    }

    if (!this.caixa.quedaSemVolta && this.caixa.body.velocity.y > 0 &&
        !temPlataformaAlcancavel(this)) {
        this.caixa.quedaSemVolta = true;
        this.caixa.setTexture(texturaPose(this, 'caindo')).setDisplaySize(78, 80);
    }

    // Mantem o contato breve; depois escolhe a pose pela direcao vertical.
    const mostrandoContato = this.caixa.texture.key === texturaPose(this, 'quasePulando') &&
        this.time.now < this.caixa.poseContatoAte;
    const machucado = this.time.now < (this.caixa.machucadoAte || 0);
    if (machucado) {
        // Tonto tem prioridade sobre as outras poses, inclusive a do pouso.
        const tonto = texturaPose(this, 'machucado');
        if (this.caixa.texture.key !== tonto) this.caixa.setTexture(tonto).setDisplaySize(78, 80);
    } else if (!mostrandoContato &&
        (this.caixa.body.velocity.y !== 0 || this.caixa.poseContatoAte !== undefined)) {
        const pose = texturaPose(this, this.caixa.body.velocity.y > 0 ? 'caindo' : 'pulando');
        if (this.caixa.texture.key !== pose) {
            this.caixa.setTexture(pose).setDisplaySize(78, 80);
        }
    }

    const velocidadeLateral = 200 * this.velocidadeJogo;
    let velocidadeX = 0;
    const ponteiro = this.input.activePointer;
    const empurrao = this.caixa.empurrao;
    const empurrado = empurrao && this.time.now < empurrao.ate;
    if (empurrado) {
        // A bicada do passaro manda o gato para o lado por um instante.
        velocidadeX = empurrao.velocidade;
    } else if (this.cursors.left.isDown || this.teclasLaterais.A.isDown) {
        velocidadeX = -velocidadeLateral;
    } else if (this.cursors.right.isDown || this.teclasLaterais.D.isDown) {
        velocidadeX = velocidadeLateral;
    } else if (ponteiro.isDown && ponteiro.downY / escalaRenderizacao > config.height / 2) {
        // O dedo e uma linha invisivel: o gato anda ate ficar alinhado com ele.
        // Vale o toque que comecou na metade de baixo, mesmo se o dedo subir depois.
        // Perto do dedo a velocidade cai aos poucos, para parar sem passar do ponto.
        // O corpo ja tem a posicao deste quadro; a imagem so e atualizada depois.
        const alvoX = Phaser.Math.Clamp(ponteiro.x / escalaRenderizacao, 20, 340);
        const distancia = alvoX - this.caixa.body.center.x;
        if (Math.abs(distancia) > 0.5) {
            velocidadeX = Phaser.Math.Clamp(distancia * 18, -velocidadeLateral, velocidadeLateral);
        }
    }

    this.caixa.body.setVelocityX(velocidadeX);
    if (Math.abs(velocidadeX) > 20 && !empurrado) {
        // As imagens originais olham para a direita; mantem a pose ao parar.
        this.caixa.setFlipX(velocidadeX < 0);
    }

    // Limita as laterais sem colocar um teto no mundo.
    const x = Phaser.Math.Clamp(this.caixa.x, 20, 340);
    if (x !== this.caixa.x) {
        const velocidadeY = this.caixa.body.velocity.y;
        this.caixa.body.reset(x, this.caixa.y);
        this.caixa.body.setVelocityY(velocidadeY);
    }

    const altura = this.cenario.alturaInicialGato - this.caixa.y;
    if (altura > this.alturaMax) {
        this.alturaMax = altura;
        if (!this.passouRecorde && this.recorde.altura > 0 && altura > this.recorde.altura) {
            this.passouRecorde = true;
            comemorarRecorde(this);
        }
    }

    const camera = this.cameras.main;
    // Deixa o gato subir ate perto do meio da tela antes de acompanhar.
    // Mantem a altura alcancada quando ele cai.
    camera.scrollY = Math.min(camera.scrollY, this.caixa.y - (config.height - folgaAbaixoGato));
    gerarPlataformas(this);
    atualizarMoedas(this, delta);
    atualizarItensPoder(this, delta);
    atualizarPoderes(this, delta);
    atualizarDicas(this, delta);
    atualizarCenario(this, delta);
    atualizarCeu(this, delta);
    limparPlataformasForaDaTela(this);
    vigiarPartida(this);
    if (this.trapaca && !this.trapaca.pego) {
        this.trapaca.espera -= delta / 1000;
        if (this.trapaca.espera <= 0) pregarPeca(this);
    }
}

function limparPlataformasForaDaTela(cena) {
    // A camera so sobe: plataformas abaixo dessa margem nao podem voltar ao jogo.
    const limite = cena.cameras.main.scrollY + config.height + 160;
    const plataformas = cena.plataformas.getChildren();
    for (let i = plataformas.length - 1; i >= 0; i--) {
        const plataforma = plataformas[i];
        if (plataforma.body.top > limite) plataforma.destroy();
    }
}

function temPlataformaAlcancavel(cena) {
    const corpo = cena.caixa.body;
    const limiteInferior = cena.cameras.main.scrollY + config.height;
    return cena.plataformas.getChildren().some(function (plataforma) {
        const alvo = plataforma.body;
        const distanciaY = alvo.top - corpo.bottom;
        if (distanciaY < -1 || alvo.top > limiteInferior ||
            alvo.bottom < cena.cameras.main.scrollY) {
            return false;
        }
        // Tempo ate a altura do tronco, considerando a gravidade do jogo.
        const gravidade = cena.physics.world.gravity.y;
        const tempo = (Math.sqrt(corpo.velocity.y ** 2 +
            2 * gravidade * Math.max(0, distanciaY)) - corpo.velocity.y) / gravidade;
        const distanciaX = Math.max(alvo.left - corpo.right, corpo.left - alvo.right, 0);
        // Nao declara uma queda definitiva enquanto um tronco pode se aproximar.
        const alcanceMovel = plataforma.movimento
            ? plataforma.movimento.amplitude * plataforma.movimento.velocidade * cena.velocidadeJogo * tempo
            : 0;
        return distanciaX <= 200 * cena.velocidadeJogo * tempo + alcanceMovel + 2;
    });
}
})();
