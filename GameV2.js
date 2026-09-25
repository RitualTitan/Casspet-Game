
// Limita o custo de preenchimento no celular, preservando o mundo de 360 x 640.
const escalaRenderizacao = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
const config = {
    type: Phaser.AUTO,
    parent: 'jogo',
    width: 360,
    height: 640,
    physics: {
        default: 'arcade',
        arcade: {
            // Atualiza o movimento a cada quadro, inclusive em telas acima de 60 Hz.
            fixedStep: false,
            gravity: { y: 300 },
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
        height: 640 * escalaRenderizacao,
        mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
// Fracao da largura da tela ocupada pela madeira em cada enquadramento.
const enquadramentoCenario = {
    abertura: 0.28,
    jogo: 0.40,
    esticamentoHorizontal: 1.15,
    centroTronco: 665,
    duracao: 900
};
const texturaCenario = {
    largura: 1399,
    altura: 8192,
    alturaFaixa: 2046,
    margem: 1
};
const game = new Phaser.Game(config);

function preload() {
    // Preserva o SVG inteiro dentro de cada recorte, com bordas sobrepostas.
    if (!this.textures.exists('cenario_0')) {
        this.load.once('filecomplete-text-cenarioSVG', (chave, tipo, svg) => {
            const documento = new DOMParser().parseFromString(svg, 'image/svg+xml');
            const raiz = documento.documentElement;
            const [x, y, largura, altura] = raiz.getAttribute('viewBox').split(/[ ,]+/).map(Number);
            raiz.setAttribute('x', x);
            raiz.setAttribute('y', y);
            raiz.setAttribute('width', largura);
            raiz.setAttribute('height', altura);
            const original = new XMLSerializer().serializeToString(raiz);
            const unidadesPorPixel = altura / texturaCenario.altura;
            const quantidade = Math.ceil(texturaCenario.altura / texturaCenario.alturaFaixa);
            for (let i = 0; i < quantidade; i++) {
                const inicio = i * texturaCenario.alturaFaixa;
                const alturaTrecho = Math.min(texturaCenario.alturaFaixa,
                    texturaCenario.altura - inicio) + texturaCenario.margem * 2;
                const topo = y + (inicio - texturaCenario.margem) * unidadesPorPixel;
                // O pixel extra evita linhas vazias na filtragem durante o zoom.
                const trecho = `<svg xmlns="http://www.w3.org/2000/svg"
                    width="${texturaCenario.largura}" height="${alturaTrecho}"
                    viewBox="${x} ${topo} ${largura} ${alturaTrecho * unidadesPorPixel}"
                    preserveAspectRatio="none">${original}</svg>`;
                const url = URL.createObjectURL(new Blob([trecho], { type: 'image/svg+xml' }));
                this.load.once('complete', () => URL.revokeObjectURL(url));
                this.load.svg('cenario_' + i, url);
            }
        });
        this.load.text('cenarioSVG', 'assets/Cenario Jogo.svg');
    }
    this.load.svg('troncoLiso', 'assets/tronco liso.svg');
    this.load.svg('troncoRachado', 'assets/tronco rachado.svg');
    this.load.image('mascote_1', 'assets/mascote_1.png');
    this.load.image('pulando', 'assets/pulando.png');
    this.load.image('quasePulando', 'assets/3quasepualndo.png');
    this.load.image('caindo', 'assets/caindo.png');
    this.load.image('moeda', 'assets/moeda-jogo.png');
    this.load.svg('moedaDourada', 'assets/granulado-dourado.svg');
    this.load.image('introducao', 'assets/inicio2.png');
}

function create(data = {}) {
    this.cache.text.remove('cenarioSVG');
    this.cameras.main.setOrigin(0, 0).setZoom(escalaRenderizacao);
    this.iniciado = false;
    this.iniciando = false;
    this.morreu = false;
    this.totalTroncos = 0;
    this.proximoGranuladoDourado = Phaser.Math.Between(18, 30);
    this.contador = 0;
    this.totalMoedas = 0;
    this.tempoMoedas = 0;
    this.moedas = this.physics.add.staticGroup();
    this.velocidadeJogo = 1;
    this.physics.world.gravity.y = config.physics.arcade.gravity.y;
    const cenarioFundo = this.add.container(config.width / 2, config.height)
        .setScrollFactor(0).setDepth(-2);
    const quantidadeFaixas = Math.ceil(texturaCenario.altura / texturaCenario.alturaFaixa);
    for (let i = 0; i < quantidadeFaixas; i++) {
        const y = i * texturaCenario.alturaFaixa - texturaCenario.altura - texturaCenario.margem;
        cenarioFundo.add(this.add.image(0, y, 'cenario_' + i)
            .setOrigin(enquadramentoCenario.centroTronco / texturaCenario.largura, 0));
    }
    this.cenario = {
        base: cenarioFundo, deslocamento: 0, alvo: 0,
        larguraTronco: enquadramentoCenario.abertura,
        alturaInicialGato: 532, paralaxe: 0.12
    };
    // O topo do chao fica em 572; metade da altura do gato e 40.
    this.caixa = this.add.image(config.width / 2, 532, 'mascote_1').setDisplaySize(78, 80);
    atualizarCenario(this, 0);
    this.physics.add.existing(this.caixa);
    this.caixa.body.setSize(1200, 1400);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.plataformas = this.physics.add.staticGroup();
    criarPlataforma(this, 180, 580, 360, true);
    this.ultimaPlataformaX = config.width / 2;
    this.ultimaPlataformaY = 580;
    this.cameras.main.setScroll(0, 0);
    gerarPlataformas(this);

    this.physics.add.collider(this.caixa, this.plataformas, pular, function (caixa) {
        // Deixa o gato atravessar as plataformas quando estiver subindo.
        return !caixa.quedaSemVolta && caixa.body.velocity.y > 0;
    });

    // Texturas de texto em alta resolucao para manter nitidez com o zoom de 2x.
    this.textoMoedas = this.add.text(config.width / 2, 16, 'Granulados: 0', {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold',
        color: '#ffe1a6', padding: { x: 8, y: 5 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);
    this.fundoContador = this.add.graphics().setScrollFactor(0).setDepth(9);
    atualizarFundoContador(this);
    this.physics.add.overlap(this.caixa, this.moedas, coletarMoeda);

    // Arte vertical inteira, com as areas de toque alinhadas as novas placas.
    const escalaInicio = config.width / 941;
    const fundoInicio = this.add.rectangle(180, 320, 360, 640, 0x233c24);
    const arteInicio = this.add.image(180, 320, 'introducao').setScale(escalaInicio);
    const dicaInicio = this.add.text(180, 586, 'Segure nos lados para mover o gato\nou use as setas do teclado.', {
        resolution: 4, fontFamily: 'Arial', fontSize: '14px', color: '#ffe1a6',
        align: 'center', lineSpacing: 5, backgroundColor: '#233c24',
        padding: { x: 8, y: 6 }
    }).setOrigin(0.5);
    const zonaMenu = (y) => this.add.zone(180, 320 + (y - 1672 / 2) * escalaInicio,
        470 * escalaInicio, 106 * escalaInicio).setInteractive({ useHandCursor: true });
    const botaoInicio = zonaMenu(760);
    const botaoConfiguracoes = zonaMenu(877);
    const botaoSair = zonaMenu(990);
    this.telaInicio = this.add.container(0, 0,
        [fundoInicio, arteInicio, dicaInicio, botaoInicio, botaoConfiguracoes, botaoSair])
        .setScrollFactor(0).setDepth(20);
    const mostrarAvisoInicio = (texto) => {
        if (this.avisoInicio) return;
        const fundo = this.add.rectangle(180, 320, 336, 230, 0x233c24)
            .setStrokeStyle(2, 0xffe1a6);
        const mensagem = this.add.text(180, 290, texto, {
            resolution: 4, fontFamily: 'Arial', fontSize: '16px', color: '#ffe1a6',
            align: 'center', wordWrap: { width: 300 }, lineSpacing: 6
        }).setOrigin(0.5);
        const fechar = this.add.text(180, 390, 'VOLTAR', {
            resolution: 4, fontFamily: 'Arial', fontSize: '18px', color: '#ffffff',
            backgroundColor: '#634128', padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        botaoInicio.disableInteractive();
        botaoConfiguracoes.disableInteractive();
        botaoSair.disableInteractive();
        this.avisoInicio = this.add.container(0, 0, [fundo, mensagem, fechar]);
        this.telaInicio.add(this.avisoInicio);
        fechar.on('pointerup', () => {
            this.avisoInicio.destroy();
            this.avisoInicio = null;
            botaoInicio.setInteractive({ useHandCursor: true });
            botaoConfiguracoes.setInteractive({ useHandCursor: true });
            botaoSair.setInteractive({ useHandCursor: true });
        });
    };
    this.avisoInicio = null;
    botaoConfiguracoes.on('pointerup', () => mostrarAvisoInicio(
        'CONTROLES\n\nSegure na metade esquerda ou direita da tela para mover o gato.\nNo teclado, use as setas.\n\nOs saltos são automáticos.'));
    botaoSair.on('pointerup', () => mostrarAvisoInicio(
        'Para sair do jogo, feche esta aba do navegador.'));
    this.physics.pause();

    const comecar = () => {
        if (this.iniciado || this.iniciando || this.avisoInicio) return;
        this.iniciando = true;
        this.telaInicio.destroy();
        this.input.keyboard.off('keydown-SPACE', comecar);
        this.input.keyboard.off('keydown-ENTER', comecar);
        // Primeiro apresenta a aproximacao; depois libera o primeiro salto.
        enquadrarCenario(this, enquadramentoCenario.jogo,
            data.reiniciar ? 0 : enquadramentoCenario.duracao, () => {
                this.iniciando = false;
                this.iniciado = true;
                this.physics.resume();
            });
    };
    // Somente a placa INICIAR comeca a partida por toque.
    botaoInicio.on('pointerup', comecar);
    this.input.keyboard.on('keydown-SPACE', comecar);
    this.input.keyboard.on('keydown-ENTER', comecar);
    if (data.reiniciar) comecar();
}

function mostrarMorte(cena) {
    if (cena.morreu) return;
    cena.morreu = true;
    cena.physics.pause();

    const sombra = cena.add.rectangle(180, 320, 360, 640, 0x160d08, 0.82);
    const titulo = cena.add.text(180, 250, 'Voc\u00ea morreu', {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '32px', fontStyle: 'bold', color: '#ffe1a6'
    }).setOrigin(0.5);
    const pontos = cena.add.text(180, 310, 'Granulados: ' + cena.totalMoedas, {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5);
    const convite = cena.add.text(180, 385, 'Toque para come\u00e7ar novamente\n\nou pressione Espa\u00e7o ou Enter', {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '18px', color: '#f4ddc9', align: 'center'
    }).setOrigin(0.5);
    cena.add.container(0, 0, [sombra, titulo, pontos, convite])
        .setScrollFactor(0).setDepth(30);

    const limparEventos = () => {
        cena.input.off('pointerdown', reiniciar);
        cena.input.keyboard.off('keydown-SPACE', reiniciar);
        cena.input.keyboard.off('keydown-ENTER', reiniciar);
    };
    let reiniciando = false;
    const reiniciar = (evento) => {
        if (reiniciando || evento.repeat) return;
        reiniciando = true;
        limparEventos();
        cena.scene.restart({ reiniciar: true });
    };
    // Exige um novo toque, evitando reiniciar ao soltar o controle da queda.
    cena.input.on('pointerdown', reiniciar);
    cena.input.keyboard.on('keydown-SPACE', reiniciar);
    cena.input.keyboard.on('keydown-ENTER', reiniciar);
    cena.events.once('shutdown', limparEventos);
}

function criarPlataforma(cena, x, y, largura, chao = false) {
    const numero = chao ? 0 : ++cena.totalTroncos;
    // O chao e os primeiros 20 troncos sao resistentes.
    const fragil = numero > 20 && Phaser.Math.Between(1, 10) <= 8;
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
    if (!chao && numero % 3 === 0) {
        const margemMovimento = plataforma.displayWidth / 2 + 12 + 40;
        plataforma.x = Phaser.Math.Clamp(plataforma.x, margemMovimento,
            config.width - margemMovimento);
        plataforma.body.updateFromGameObject();
        plataforma.movimento = {
            centro: plataforma.x,
            fase: 0,
            sentido: numero % 2 === 0 ? 1 : -1,
            amplitude: 40,
            velocidade: 1.2
        };
    }
    plataforma.body.checkCollision.down = false;
    plataforma.body.checkCollision.left = false;
    plataforma.body.checkCollision.right = false;
    // Especial raro: intervalo aleatorio de 18 a 30 plataformas entre dourados.
    const dourada = !chao && numero >= cena.proximoGranuladoDourado;
    if (dourada) cena.proximoGranuladoDourado = numero + Phaser.Math.Between(18, 30);
    if (!chao && (dourada || Phaser.Math.Between(1, 100) <= 40)) {
        criarMoeda(cena, plataforma, dourada);
    }
}

function criarMoeda(cena, plataforma, dourada = false) {
    const moeda = cena.add.image(plataforma.x, plataforma.y - 60, dourada ? 'moedaDourada' : 'moeda')
        .setScale(38 / 808).setDepth(2);
    moeda.dourada = dourada;
    moeda.plataforma = plataforma;
    moeda.yBase = moeda.y;
    moeda.fase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    if (dourada) {
        moeda.brilho = cena.add.graphics().setDepth(1);
        moeda.once('destroy', () => moeda.brilho.destroy());
        atualizarBrilhoGranulado(moeda, 0);
    }
    cena.moedas.add(moeda);
    moeda.body.updateFromGameObject();
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
        if (moeda.plataforma.active) moeda.x = moeda.plataforma.x;
        moeda.y = moeda.yBase + Math.sin(tempo * 3 + moeda.fase) * 5;
        moeda.angle = Math.sin(tempo * 6 + moeda.fase) * 12;
        if (moeda.dourada) atualizarBrilhoGranulado(moeda, tempo);
        // Mantem a area de coleta junto da moeda enquanto ela flutua.
        moeda.body.updateFromGameObject();
    }
}

function atualizarFundoContador(cena) {
    const texto = cena.textoMoedas;
    // Acompanha a largura do texto quando a quantidade de digitos aumenta.
    cena.fundoContador.clear().fillStyle(0x382017, 1)
        .fillRoundedRect(texto.x - texto.width / 2, texto.y, texto.width, texto.height, 10);
}

function atualizarPlataformasMoveis(cena, delta) {
    for (const plataforma of cena.plataformas.getChildren()) {
        const movimento = plataforma.movimento;
        if (!movimento) continue;
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
    cena.totalMoedas += 1;
    cena.textoMoedas.setText('Granulados: ' + cena.totalMoedas);
    atualizarFundoContador(cena);
    if (moeda.dourada) aplicarImpulsoDourado(caixa);
    const efeito = cena.add.image(moeda.x, moeda.y, moeda.texture.key)
        .setScale(moeda.scaleX).setAngle(moeda.angle).setDepth(3);
    moeda.destroy();
    cena.tweens.add({
        targets: efeito, y: efeito.y - 24, alpha: 0,
        scaleX: efeito.scaleX * 1.4, scaleY: efeito.scaleY * 1.4,
        duration: 220, ease: 'Quad.easeOut',
        onComplete: () => efeito.destroy()
    });
}

function aplicarImpulsoDourado(caixa) {
    const cena = caixa.scene;
    // Velocidade 1,6x maior: o salto sobe cerca de 2,56x a altura normal.
    caixa.quedaSemVolta = false;
    caixa.poseContatoAte = 0;
    caixa.setTexture('pulando').setDisplaySize(78, 80);
    caixa.body.setVelocityY(Math.min(caixa.body.velocity.y, -640 * cena.velocidadeJogo));
    const onda = cena.add.circle(caixa.x, caixa.y + 32, 16, 0xffda45, 0.2)
        .setStrokeStyle(3, 0xffec99).setDepth(3);
    cena.tweens.add({
        targets: onda, scaleX: 3, scaleY: 1.3, alpha: 0,
        duration: 350, ease: 'Quad.easeOut', onComplete: () => onda.destroy()
    });
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
    // Nas faixas de 1399 px, o tronco ocupa cerca de 182,5 px.
    const escala = config.width * fundo.larguraTronco / 182.5;
    // Centraliza pela madeira da arte e alarga o cenario em 15%.
    fundo.base.setScale(escala * enquadramentoCenario.esticamentoHorizontal, escala);
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

function pular(caixa,plataforma) {
    // Cada tronco conta uma unica vez; o chao nao entra na contagem.
    if (plataforma.numero > 0 && !plataforma.contada) {
        plataforma.contada = true;
        caixa.scene.contador += 1;
        if (caixa.scene.contador % 20 === 0) {
            caixa.scene.plataformas.getChildren().forEach(function (tronco) {
                ajustarLarguraTronco(caixa.scene, tronco);
            });
        }
    }
    // Acelera 25% da velocidade inicial a cada 20 troncos alcancados.
    const velocidade = 1 + Math.floor(caixa.scene.contador / 20) * 0.25;
    caixa.scene.velocidadeJogo = velocidade;
    // Gravidade proporcional ao quadrado preserva a altura e o alcance do salto.
    caixa.scene.physics.world.gravity.y = config.physics.arcade.gravity.y * velocidade ** 2;
    // A pose de contato acompanha o ritmo do jogo.
    caixa.setTexture('quasePulando').setDisplaySize(78, 80);
    caixa.poseContatoAte = caixa.scene.time.now + 120 / velocidade;
    // Garante o impulso mesmo quando a plataforma quebra.
    caixa.body.setVelocityY(-400 * velocidade);
    if (plataforma.fragil) { 
        plataforma.destroy();
    }
}

function update(time, delta) {
    if (!this.iniciado || this.morreu) return;
    atualizarPlataformasMoveis(this, delta);
    if (this.caixa.y - this.caixa.displayHeight / 2 >
        this.cameras.main.scrollY + config.height) {
        mostrarMorte(this);
        return;
    }

    if (!this.caixa.quedaSemVolta && this.caixa.body.velocity.y > 0 &&
        !temPlataformaAlcancavel(this)) {
        this.caixa.quedaSemVolta = true;
        this.caixa.setTexture('caindo').setDisplaySize(78, 80);
    }

    // Mantem o contato breve; depois escolhe a pose pela direcao vertical.
    const mostrandoContato = this.caixa.texture.key === 'quasePulando' &&
        this.time.now < this.caixa.poseContatoAte;
    if (!mostrandoContato &&
        (this.caixa.body.velocity.y !== 0 || this.caixa.poseContatoAte !== undefined)) {
        const pose = this.caixa.body.velocity.y > 0 ? 'caindo' : 'pulando';
        if (this.caixa.texture.key !== pose) {
            this.caixa.setTexture(pose).setDisplaySize(78, 80);
        }
    }

    let direcao = 0;
    if (this.cursors.left.isDown) {
        direcao = -1;
    } else if (this.cursors.right.isDown) {
        direcao = 1;
    } else if (this.input.activePointer.isDown) {
        // Segure na metade esquerda ou direita da tela para andar.
        direcao = this.input.activePointer.x < this.scale.gameSize.width / 2 ? -1 : 1;
    }

    this.caixa.body.setVelocityX(direcao * 200 * this.velocidadeJogo);
    if (direcao !== 0) {
        // As imagens originais olham para a direita; mantem a pose ao parar.
        this.caixa.setFlipX(direcao < 0);
    }

    // Limita as laterais sem colocar um teto no mundo.
    const x = Phaser.Math.Clamp(this.caixa.x, 20, 340);
    if (x !== this.caixa.x) {
        const velocidadeY = this.caixa.body.velocity.y;
        this.caixa.body.reset(x, this.caixa.y);
        this.caixa.body.setVelocityY(velocidadeY);
    }

    const camera = this.cameras.main;
    // Deixa o gato subir ate perto do meio da tela antes de acompanhar.
    // Mantem a altura alcancada quando ele cai.
    camera.scrollY = Math.min(camera.scrollY, this.caixa.y - 300);
    gerarPlataformas(this);
    atualizarMoedas(this, delta);
    atualizarCenario(this, delta);
    limparPlataformasForaDaTela(this);
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
