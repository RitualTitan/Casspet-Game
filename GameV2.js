
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
        // Mais pixels no canvas, mantendo o mundo logico em 360 x 640.
        width: 720,
        height: 1280,
        mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
// Fracao da largura da tela ocupada pela madeira em cada enquadramento.
const enquadramentoCenario = {
    abertura: 0.28,
    jogo: 0.40,
    duracao: 900
};
const game = new Phaser.Game(config);

function preload() {
    // CREU e Group 3141 divididos em partes de ate 2048 px para o celular.
    for (let i = 0; i < 8; i++) {
        this.load.image('ceu_' + i, 'assets/CREU-camada-' + i + '.png');
        this.load.image('arvore_' + i, 'assets/Group3141-camada-' + i + '.png');
    }
    this.load.svg('troncoLiso', 'assets/tronco liso.svg');
    this.load.svg('troncoRachado', 'assets/tronco rachado.svg');
    this.load.image('mascote_1', 'assets/mascote_1.png');
    this.load.image('pulando', 'assets/pulando.png');
    this.load.image('quasePulando', 'assets/3quasepualndo.png');
    this.load.image('caindo', 'assets/caindo.png');
    this.load.image('moeda', 'assets/image 201.png');
    this.load.image('gramaBase', 'assets/base.png');
}

function create(data = {}) {
    this.cameras.main.setOrigin(0, 0).setZoom(2);
    this.iniciado = false;
    this.iniciando = false;
    this.morreu = false;
    this.totalTroncos = 0;
    this.contador = 0;
    this.totalMoedas = 0;
    this.tempoMoedas = 0;
    // Frame limitado ao desenho: o PNG original tem grandes margens transparentes.
    const texturaMoeda = this.textures.get('moeda');
    if (!texturaMoeda.has('recorte')) {
        texturaMoeda.add('recorte', 0, 1406, 2476, 1616, 985);
    }
    this.moedas = this.physics.add.staticGroup();
    this.velocidadeJogo = 1;
    this.physics.world.gravity.y = config.physics.arcade.gravity.y;
    criarFundoCenario(this);
    // Aproveita somente a faixa de grama da base antiga, sem trocar a arvore.
    const texturaGrama = this.textures.get('gramaBase');
    if (!texturaGrama.has('grama')) {
        texturaGrama.add('grama', 0, 400, 850, 600, 130);
    }
    // Alinhada ao chao inicial; sai da tela quando a camera acompanha o gato.
    this.add.image(config.width / 2, 568, 'gramaBase', 'grama')
        .setOrigin(0.5, 0).setDisplaySize(config.width, 78).setDepth(-1);
    const arvoreFundo = this.add.container(config.width / 2, config.height)
        .setScrollFactor(0);
    for (let i = 0; i < 8; i++) {
        arvoreFundo.add(this.add.image(0, (i - 8) * 2048,
            'arvore_' + i)
            .setOrigin(0.5, 0));
    }
    this.cenario = {
        base: arvoreFundo, deslocamento: 0, alvo: 0,
        larguraTronco: enquadramentoCenario.abertura,
        alturaInicialGato: 532, paralaxe: 0.12, continuacoes: []
    };
    const imagem = this.textures.get('arvore_0').getSourceImage();
    prepararTransicaoCenario(this, imagem, 'troncoContinuoTransicao');
    const escalaMinima = config.width * Math.min(
        enquadramentoCenario.abertura, enquadramentoCenario.jogo) / 730;
    const quantidade = Math.ceil(config.height / (1952 * escalaMinima)) + 2;
    for (let i = 0; i < quantidade; i++) {
        this.cenario.continuacoes.push(this.add.image(config.width / 2, 0,
            'troncoContinuoTransicao')
            .setOrigin(0.5, 1).setScrollFactor(0));
    }
    // O topo do chao fica em 572; metade da altura do gato e 40.
    this.caixa = this.add.image(60, 532, 'mascote_1').setDisplaySize(78, 80);
    atualizarCenario(this, 0);
    this.physics.add.existing(this.caixa);
    this.caixa.body.setSize(1200, 1400);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.plataformas = this.physics.add.staticGroup();
    criarPlataforma(this, 180, 580, 360, true);
    this.ultimaPlataformaX = 200;
    this.ultimaPlataformaY = 580;
    this.cameras.main.setScroll(0, 0);
    gerarPlataformas(this);

    this.physics.add.collider(this.caixa, this.plataformas, pular, function (caixa) {
        // Deixa o gato atravessar as plataformas quando estiver subindo.
        return !caixa.quedaSemVolta && caixa.body.velocity.y > 0;
    });

    // Texturas de texto em alta resolucao para manter nitidez com o zoom de 2x.
    this.textoMoedas = this.add.text(16, 16, 'Granulados: 0', {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold',
        color: '#ffe1a6', padding: { x: 8, y: 5 }
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(10);
    this.fundoContador = this.add.graphics().setScrollFactor(0).setDepth(9);
    atualizarFundoContador(this);
    this.physics.add.overlap(this.caixa, this.moedas, coletarMoeda);

    const sombra = this.add.rectangle(180, 320, 360, 640, 0x160d08, 0.30);
    const titulo = this.add.text(180, 230, 'SALTO DO GATO', {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: '#ffe1a6'
    }).setOrigin(0.5);
    const convite = this.add.text(180, 320, 'Toque para começar', {
        resolution: 4,
        fontFamily: 'Arial', fontSize: '25px', color: '#ffffff'
    }).setOrigin(0.5);
    const ajuda = this.add.text(180, 390,
        'Arraste o dedo para guiar o gato\nou use as setas do teclado.\n\nOs primeiros 20 troncos são resistentes.', {
            resolution: 4, fontFamily: 'Arial', fontSize: '15px', color: '#f4ddc9',
            align: 'center', lineSpacing: 7
        }).setOrigin(0.5);
    this.telaInicio = this.add.container(0, 0, [sombra, titulo, convite, ajuda])
        .setScrollFactor(0).setDepth(20);
    this.physics.pause();

    const comecar = () => {
        if (this.iniciado || this.iniciando) return;
        this.iniciando = true;
        this.telaInicio.destroy();
        this.input.off('pointerup', comecar);
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
    // Comeca ao soltar o toque, sem usar o mesmo toque para mover o gato.
    this.input.on('pointerup', comecar);
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
    plataforma.body.checkCollision.down = false;
    plataforma.body.checkCollision.left = false;
    plataforma.body.checkCollision.right = false;
    // Cada tronco tem 40% de chance de receber um granulado.
    if (!chao && Phaser.Math.Between(1, 100) <= 40) criarMoeda(cena, plataforma);
}

function criarMoeda(cena, plataforma) {
    const moeda = cena.add.image(plataforma.x, plataforma.y - 60, 'moeda', 'recorte')
        .setScale(38 / 1616).setDepth(2);
    moeda.plataforma = plataforma;
    moeda.yBase = moeda.y;
    moeda.fase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    cena.moedas.add(moeda);
    moeda.body.updateFromGameObject();
}

function atualizarMoedas(cena, delta) {
    cena.tempoMoedas += delta;
    // Copia a lista porque moedas fora da tela sao removidas durante o percurso.
    cena.moedas.getChildren().slice().forEach(function (moeda) {
        if (moeda.yBase > cena.cameras.main.scrollY + config.height + 60) {
            moeda.destroy();
            return;
        }
        const tempo = cena.tempoMoedas / 1000;
        if (moeda.plataforma.active) moeda.x = moeda.plataforma.x;
        moeda.y = moeda.yBase + Math.sin(tempo * 3 + moeda.fase) * 5;
        moeda.angle = Math.sin(tempo * 6 + moeda.fase) * 12;
        // Mantem a area de coleta junto da moeda enquanto ela flutua.
        moeda.body.updateFromGameObject();
    });
}

function atualizarFundoContador(cena) {
    const texto = cena.textoMoedas;
    // Acompanha a largura do texto quando a quantidade de digitos aumenta.
    cena.fundoContador.clear().fillStyle(0x382017, 1)
        .fillRoundedRect(texto.x, texto.y, texto.width, texto.height, 10);
}

function coletarMoeda(caixa, moeda) {
    const cena = caixa.scene;
    if (!cena.iniciado || cena.morreu || !moeda.active || moeda.coletada) return;
    moeda.coletada = true;
    moeda.body.enable = false;
    cena.totalMoedas += 1;
    cena.textoMoedas.setText('Granulados: ' + cena.totalMoedas);
    atualizarFundoContador(cena);
    const efeito = cena.add.image(moeda.x, moeda.y, 'moeda', 'recorte')
        .setScale(moeda.scaleX).setAngle(moeda.angle).setDepth(3);
    moeda.destroy();
    cena.tweens.add({
        targets: efeito, y: efeito.y - 24, alpha: 0,
        scaleX: efeito.scaleX * 1.4, scaleY: efeito.scaleY * 1.4,
        duration: 220, ease: 'Quad.easeOut',
        onComplete: () => efeito.destroy()
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

function criarFundoCenario(cena) {
    // Camada distante; a profundidade -1 fica disponivel para a proxima camada.
    cena.fundoCenario = cena.add.container(0, 0).setScrollFactor(0).setDepth(-2);
    let altura = 0;
    for (let i = 0; i < 8; i++) {
        const trecho = cena.add.image(config.width / 2, altura, 'ceu_' + i)
            .setOrigin(0.5, 0);
        trecho.setScale(config.width / trecho.width);
        cena.fundoCenario.add(trecho);
        altura += trecho.displayHeight;
    }
    cena.fundoCenario.alturaTotal = altura;
    cena.fundoCenario.y = config.height - altura;
}

function prepararTransicaoCenario(cena, imagem, chave) {
    if (cena.textures.exists(chave)) return;
    // Reutiliza o topo da textura escolhida acima da imagem inteira.
    const largura = imagem.width;
    const altura = 1984;
    const textura = cena.textures.createCanvas(chave, largura, altura);
    const contexto = textura.getContext();
    contexto.drawImage(imagem, 0, 64, largura, altura, 0, 0, largura, altura);
    const inicio = altura - 32;
    const gradiente = contexto.createLinearGradient(0, inicio, 0, altura);
    gradiente.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradiente.addColorStop(1, 'rgba(0, 0, 0, 0)');
    contexto.globalCompositeOperation = 'destination-in';
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, largura, altura);
    contexto.globalCompositeOperation = 'source-over';
    textura.refresh();
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
    const larguraMadeira = config.width * fundo.larguraTronco;
    const escalaBase = larguraMadeira / 730;
    const escalaContinuacao = escalaBase;
    fundo.base.setScale(escalaBase);
    fundo.base.x = config.width / 2;
    fundo.alturaTrecho = 1984 * escalaContinuacao;
    fundo.sobreposicao = 32 * escalaContinuacao;
    fundo.passoTrecho = fundo.alturaTrecho - fundo.sobreposicao;
    // Acompanha a maior altura do gato, sem voltar para baixo entre os saltos.
    fundo.alvo = Math.max(fundo.alvo,
        (fundo.alturaInicialGato - cena.caixa.y) * fundo.paralaxe);
    // Suavizacao independente da taxa de quadros; o fundo se move mais devagar.
    const suavizacao = 1 - Math.exp(-5 * delta / 1000);
    fundo.deslocamento += (fundo.alvo - fundo.deslocamento) * suavizacao;
    // O ceu sobe mais devagar que a arvore, revelando o fundo de baixo para cima.
    const alturaCeu = cena.fundoCenario.alturaTotal;
    cena.fundoCenario.y = config.height - alturaCeu + Math.min(
        fundo.deslocamento * 0.35, Math.max(0, alturaCeu - config.height));
    // Ao olhar mais para cima, a imagem desce e revela o trecho acima da base.
    fundo.base.y = config.height + fundo.deslocamento;
    const emenda = fundo.base.y - 16384 * escalaBase;
    fundo.base.setVisible(emenda < config.height);
    // Recicla somente os trechos fora da tela, sem criar imagens a cada quicada.
    const primeiro = Math.max(0, Math.floor((emenda - config.height) / fundo.passoTrecho));
    fundo.continuacoes.forEach(function (trecho, indice) {
        trecho.setScale(escalaContinuacao);
        trecho.x = config.width / 2;
        trecho.y = emenda + fundo.sobreposicao - (primeiro + indice) * fundo.passoTrecho;
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

    const velocidadeMaxima = 200 * this.velocidadeJogo;
    let velocidadeX = 0;
    if (this.cursors.left.isDown) {
        velocidadeX = -velocidadeMaxima;
    } else if (this.cursors.right.isDown) {
        velocidadeX = velocidadeMaxima;
    } else if (this.input.activePointer.isDown) {
        // Converte o toque para o mundo, incluindo o zoom e a escala do canvas.
        const ponteiro = this.input.activePointer;
        const ponto = this.cameras.main.getWorldPoint(ponteiro.x, ponteiro.y);
        const alvoX = Phaser.Math.Clamp(ponto.x, 20, 340);
        const distancia = alvoX - this.caixa.x;
        // Segue o dedo sem teletransportar ou ultrapassar a velocidade dos saltos.
        const resposta = Math.min(18, 1000 / Math.max(delta, 1));
        if (Math.abs(distancia) > 0.5) {
            velocidadeX = Phaser.Math.Clamp(distancia * resposta,
                -velocidadeMaxima, velocidadeMaxima);
        }
    }

    this.caixa.body.setVelocityX(velocidadeX);
    if (velocidadeX !== 0) {
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

    const camera = this.cameras.main;
    // Deixa o gato subir ate perto do meio da tela antes de acompanhar.
    // Mantem a altura alcancada quando ele cai.
    camera.scrollY = Math.min(camera.scrollY, this.caixa.y - 300);
    gerarPlataformas(this);
    atualizarMoedas(this, delta);
    atualizarCenario(this, delta);
    // Plataformas visiveis continuam disponiveis enquanto houver chance de pousar.
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
        return distanciaX <= 200 * cena.velocidadeJogo * tempo + 2;
    });
}
