# Granulando (Casspet®) - contexto para o Claude

Jogo 2D de subir pulando: o gato pula sozinho de tronco em tronco numa arvore gigante,
o jogador so move para os lados e coleta granulados. Phaser 3.90 por CDN, sem build.
Todo o codigo esta em `GameV2.js`; codigo e comentarios em portugues, comentarios sem acento.

## Decisoes do usuario (respeitar sempre)

- **Foco em celular.** As dicas na tela falam so de toque; o teclado funciona no PC, mas nao aparece nas dicas.
  Teste sempre em viewport de celular (ex.: 375 x 812).
- **Controle pelo dedo.** O dedo e uma linha invisivel: com o toque comecando na metade de baixo da tela, o gato
  anda ate ficar alinhado na vertical com o dedo e para ali. Nada de marcacao visivel e nada de "toque nos lados".
- **Tela responsiva.** O mundo tem 360 de largura e a altura (`config.height`, de 640 a 860) acompanha o formato
  do celular. Posicione a interface a partir de `config.height`, nunca com 640/320 fixos. O chao fica a 44 da
  borda de baixo e a camera deixa `folgaAbaixoGato` abaixo do gato; a sobra das telas altas aparece acima dele.
- **O guaxinim (vilao) nunca pode ser pego.** Ele foge sempre um tronco a frente do gato e precisa ficar
  visivel. Uma mecanica de "+5 ao pegar" ja foi feita e o usuario recusou.
- **Encostar no guaxinim e permitido** (pedido do usuario): de vez em quando ele ri de costas para o gato
  (`distrairGuaxinim`); se o gato encostar nele nessa hora, ele se assusta, `granuladosSusto` granulados saem
  do pacote e voam ate o gato, e ele continua fugindo. O jogo nunca acaba nem para por isso.
- **Nenhum bicho come granulado** (so um castor poderia, e nao ha castor no jogo).
- **Passaro inimigo nao mata:** a bicada derruba `granuladosBicada` granulados e empurra o gato para o lado.
- Textos: a tela de derrota diz "Você perdeu". Na historia o item roubado e um **pacote** (nunca "saco")
  de **Granulado de Madeira Casspet®**.

## Historia

A partida iniciada pelo INICIAR do menu comeca pelos quadrinhos (`assets/historia.webp`, 6 quadros recortados
por `quadrosHistoria`); JOGAR DE NOVO vai direto para o jogo, sem rever a historia (decisoes do usuario). O gato estava feliz com o pacote de granulado, o guaxinim
roubou e fugiu subindo a arvore, derrubando granulados pelos troncos. PULAR vai direto para o jogo; tambem pode
ser revista em CONFIGURACOES > HISTORIA. A composicao (quadro com moldura e legenda em pergaminho) e aprovada;
o acabamento segue a madeira da loja: floresta escurecida no fundo e PULAR como botao de madeira. O progresso
continua em pontinhos (o usuario nao gostou da tirinha de granulados).

## Publicacao

- **Dois repositorios (decisao do usuario, para ninguem copiar o codigo):** o codigo fica no privado
  `RitualTitan/Casspet-Game-codigo`, branch `main`. A cada push na `main` dele, a acao
  `.github/workflows/publicar.yml` roda `ferramentas/publicar.js`, que embaralha o `GameV2.js`
  (javascript-obfuscator) e junta so o que o jogo carrega, e manda tudo para o publico `RitualTitan/Casspet-Game`
  (um unico commit, sempre substituido). O GitHub Pages publica esse em https://ritualtitan.github.io/Casspet-Game/
  (leva ~2 min). **Nunca edite o repositorio publico.** A acao precisa do segredo `TOKEN_SITE` (token com
  escrita so no publico); sem ele, nao publica nada.
- Imagem nova carregada pelo jogo: fica numa das pastas de `pastasSite` (`ferramentas/publicar.js`) ou aparece
  inteira entre aspas no `GameV2.js` (`'assets/x.webp'`), senao nao vai para o site. Depois de mudar o jogo,
  teste tambem a versao embaralhada: `node ferramentas/publicar.js` e sirva a pasta `site/`.
- **Nunca mexa direto na `main`.** Toda feature ou teste e feita num branch proprio, testada, apresentada
  (previa jogavel e/ou Pull Request) e so vai para a `main` depois que o usuario aprovar.
- Quando o usuario pedir para "subir no git para jogar" algo ja aprovado, e merge + push na `main`.
- A cada mudanca no jogo, troque o `?v=` do `GameV2.js` no `index.html`, para o celular nao usar script em cache.
- **Instalar como app (PWA):** `manifest.webmanifest` (tela cheia, retrato, icones em `assets/icone/`, feitos da
  arte do menu com o gato parado) e `sw.js`, que guarda os arquivos para abrir sem internet. O `sw.js` busca
  sempre a rede primeiro e so usa o guardado quando ela falha, entao atualizacoes chegam na hora. Botao
  "Instalar" no alto do menu: no Android abre o convite do navegador (`window.pedidoInstalar`); no iPhone
  explica Compartilhar > Adicionar a Tela de Inicio. Some quando o jogo ja esta aberto como app.

## Como rodar e validar

- `python -m http.server 8000` na pasta e abrir http://localhost:8000.
- `node --check GameV2.js` para a sintaxe; depois jogar no navegador (inicio, pulos, guaxinim, derrota, reinicio).

## Cenario, chao e audio

- **Cenario (aprovado pelo usuario):** feito com imagens geradas por IA pelo usuario (pe da arvore, dois
  trechos do tronco, copa, nuvens e galhos, em `arte-cenario-ia/recebidas/`, a partir dos prompts e guias de
  `arte-cenario-ia/`). `ferramentas/montar-cenario-ia.html` tira o fundo magenta, deixa os troncos com a mesma
  largura (315 px) e no mesmo eixo, empilha as pecas com emendas suaves e gera `assets/cenario/cenario-N.webp`
  (1024 x 12264 em 6 faixas, sem esticar). **Se uma imagem mudar, monte as faixas de novo.** As medidas
  (`texturaCenario`) precisam bater entre a ferramenta e o jogo; a copa sai da tela em `troncoFimCopa` (157).
- Cenario antigo: `assets/Cenario Jogo 1.svg` (12 MB) e `ferramentas/gerar-cenario.html`, que gerava as faixas
  antigas (1399 px, esticadas 15%). `ferramentas/desenhar-cenario.html` foi a primeira tentativa do cenario
  novo, desenhada em codigo e recusada; serviu para os guias. Nenhum dos dois e usado pelo jogo.
- Chao: `assets/chao.webp` (versao reduzida de `assets/chao-original.webp`). `alturaChao` define a altura
  da grama e `superficieChao` a linha da grama dentro da imagem.
- Guaxinim: `assets/guaxinim.png` (recorte transparente de `guaxinim-original.webp`); o pacote que ele
  carrega e a textura `fx_saco`, desenhada no codigo. Expressoes (geradas no Magnific, mesmo tamanho):
  `guaxinim-rindo.png` (provocando e distraido) e `guaxinim-susto.png` (depois do susto), de quatro patas
  como o original e com o mesmo corpo (decisao do usuario: nada de guaxinim em pe ou menor).
- Gato: as poses usadas estao em `assets/gato/*.webp` (512 x 512, reduzidas com boa qualidade dos originais de
  2048 que continuam em `assets/`: `gato-parado.webp`, `3quasepualndo.png`, `pulando.png`, `caindo.png`,
  `gato-machucado.webp`). O parado foi redesenhado no estilo das outras poses (o antigo, mais escuro, e
  `mascote_1.png`). O machucado (tonto) aparece ~0,5 s quando o passaro/OVNI acerta.
- **Nitidez e peso:** o jogo desenha perto da resolucao real da tela (`escalaRenderizacao`, ate 2,5x) e as
  imagens tem o tamanho em que aparecem: poses 512 (`tamanhoPose`; `cabecaGato` e o corpo fisico usam a
  grade de 2048 convertida), granulado 256 (`assets/granulado.webp`, `larguraGranulado`), menu
  `assets/inicio.webp` (de `inicio2.png`), troncos SVG rasterizados em 384 x 86. Madeira desenhada em 3x
  (`escalaMadeira`). Imagem nova de personagem: 512 x 512 webp, nunca a original enorme.
- A textura `introducao` (arte do menu) tem recortes (`madeiraLoja`); ao usar a arte inteira, passe o
  frame `'__BASE'`, senao o Phaser usa o primeiro recorte.
- Sons e musica sao sintetizados com Web Audio (objetos `som`, `musica` e `trilha`), sem arquivos de audio.
- **Ceu:** as faixas do cenario nao tem ceu (a ferramenta tira o fundo e deixa transparente).
  O ceu e desenhado no codigo (`criarCeu`/`atualizarCeu`) e muda com a altura alcancada em troncos (`fasesCeu`):
  dia, fim de tarde (30), por do sol (65), noite (95) e espaco (150), com sol que se poe, estrelas, estrelas
  cadentes, lua, Terra e planeta com anel; a luz do cenario acompanha. Aprovado pelo usuario. As fases evitam
  multiplos de 20 (aviso de "MAIS RAPIDO!") e a noite vem antes da copa do pinheiro (~110 a ~185 troncos).
- **Titulos de fase** ("FIM DE TARDE", "ESPACO!"): desligados em teste pelo interruptor `mostrarAvisosCeu`.
- **Espaco em movimento:** Terra, Lua e planeta com anel descem e ficam para tras; `atualizarEspaco` solta
  planetas, asteroides, nebulosas, satelite e o **Planeta Casspet** (cor de granulado, cratera de patinha e anel
  de granulados), que descem com a subida e derivam sozinhos, a partir de `troncoFimCopa` (quando a copa
  do pinheiro sai da tela). As folhas param de cair no espaco. No espaco,
  dois a cada tres troncos se mexem, e mais longe.
- **Bichos:** tudo desenhado no codigo. Passaro inimigo (`fx_passaro_a/b`, `criarPassaro`) a partir de
  `troncoPassaros`, com um "!" na borda antes de entrar. No espaco viram **OVNIs** (`fx_ovni_a/b`): balancam,
  as vezes param no meio e disparam, ficam mais frequentes e vem em dupla, para o jogador nao decorar o padrao. Enfeites atras dos troncos
  (`atualizarVidaFundo`), pela fase do ceu: borboletas no dia e fim de tarde, bandos de passarinhos ate o por
  do sol e vaga-lumes a noite. Sao menores e mais apagados que o passaro inimigo, para nao confundir.
- **Poderes desligados:** o usuario ainda vai decidir sobre eles. Ficam no codigo, desligados pelo interruptor
  `ativarPoderes` (sem poderes, a missao "Pegue N poderes" sai do sorteio). So ligue quando o usuario aprovar.
- **Poderes** (`poderes`, `criarItemPoder`, `ativarPoder`, `atualizarPoderes`): bolhas no meio de alguns troncos,
  a primeira perto de `troncoPoderes` e depois a cada 22 a 34. **Ima** puxa os granulados perto (`raioIma`),
  **escudo** segura uma bicada (so aparece depois de `troncoPassaros`) e **pacote furado** faz o pacote do
  guaxinim vazar: todo tronco a frente ganha granulado. Icones redondos embaixo dos troncos, com anel de tempo.
  O tempo corre no `update`, entao para na pausa.
- **Combo** (`niveisCombo`, `contarCombo`, `quebrarCombo`): granulados seguidos valem x2 (5) e x3 (10). Quebra
  com uma bicada ou quando o gato pousa num tronco novo deixando para tras o granulado de um tronco ja pisado
  (os pulados pela mola ou pelo super pulo nao contam). Etiqueta embaixo da placa de granulados.
- **Troncos especiais** (nunca rachados): **mola** (`montarMola`, `apertarMola`, `pularNaMola`, `impulsoMola`) a partir de
  `troncoMola`, a cada 12 a 20; **balanco de corda** a partir de `troncoBalanco`, a cada 14 a 22 (`montarBalanco`,
  movimento `tipo: 'balanco'`): duas cordas como as da placa do menu, presas num galho com folhas logo acima.
  O usuario recusou os cipos (terminavam no meio do caminho), a gangorra e o "galho mole" que quicava.
- **Artes dos especiais** (geradas no Magnific com a arte do menu como referencia de estilo; as desenhadas no codigo
  ficaram simples demais): `assets/especiais/galho.webp` (folhas do balanco) e `assets/especiais/mola.webp`.
  A mola encolhe sob os pes do gato enquanto ele desce (`apertarMola`), para ele nao entrar na arte.

- **Primeira partida guiada:** na primeira partida do aparelho uma mao (indicador, nunca o dedo do meio no centro
  da palma) arrasta de um lado para o outro na metade de baixo com "Arraste o dedo aqui embaixo" e some
  quando o jogador arrasta (`mostrarMaoTutorial`). Depois, plaquinhas de madeira embaixo do placar explicam
  cada novidade na primeira vez que ela aparece (`dicasJogo`: tronco rachado, passaro, bolha de poder, mola,
  combo), uma por vez e so uma vez por aparelho (`chaveDicas`). A mao e temporaria: o controle continua sem
  marcacao visivel.

## Anti-trapaca (pedido do usuario)

Um programador achou o atalho de teste e subiu voando para se gabar do recorde. Nao da para impedir 100% (o
jogo roda no navegador: mesmo com o codigo privado e o site embaralhado, o mesmo programador quebrou em menos
de 30 min), entao o jogo dificulta e prega uma peca em quem trapaceia. **Decisao do usuario: parar por aqui.**
Nada de novas travas no navegador; servidor conferindo as partidas so se um dia houver ranking online ou premio.
- **Codigo embrulhado:** todo o `GameV2.js` fica dentro de `(() => { ... })();`, para `game` e as funcoes nao
  aparecerem no console. Os testes e a previa tiram essa embalagem para enxergar o jogo por dentro.
- **Shift + B virou isca:** o super pulo ainda funciona por um instante e entrega o trapaceiro. Nao use para
  testar; a previa tem os seus botoes (incluindo "Simular trapaca").
- **Vigia** (`vigiarPartida`, a cada quadro): gravidade diferente de `gravidadeBase * velocidade^2`, subida mais
  rapida que `650 * velocidade + 80` (o dourado e 640), placar diferente do espelho `vigia.moedas`/`vigia.troncos`
  ou mais de `2600 * velocidade` de altura em 10 s de relogio real. **Qualquer coisa nova que mude placar,
  impulso, gravidade ou teleporte o gato precisa atualizar o vigia ou caber nesses limites**, senao um jogador
  honesto leva a peca.
- **Placar limitado pelo tempo real** (`placarImpossivel`, `vigia.tempo`): o hacker burlou a primeira versao mudando
  o valor de cada granulado (placar e espelho subiam juntos: 8,6e+118 granulados com 0 troncos). Agora, a cada
  quadro e na derrota, os troncos nao passam de `troncosPorSegundo` por segundo real de partida (sem pausa), os
  granulados de `granuladosPorTronco` por tronco mais `granuladosPorSegundo` por segundo, e a altura de 360 por
  tronco; acima disso e trapaca. O recorde lacrado tambem precisa ser possivel (`recordeImpossivel`, nao so os
  antigos) e o cofrinho, mesmo assinado, nao passa de `limiteCofrinho`. Qualquer recurso novo que renda mais
  troncos ou granulados por segundo precisa caber nesses limites. Nenhuma checagem no navegador e definitiva:
  so um ranking com servidor seria a prova de trapaca.
- **Recorde lacrado** (`salvarRecorde`, `selarRecorde`): lacre que nao bate (editado a mao) ou recorde antigo
  impossivel (`recordeImpossivel`: altura ou granulados muito acima do que os troncos permitem) contam como trapaca.
- **Dados assinados** (`chavesAssinadas`: recorde, cofrinho/loja e missoes): salvos como `{ dados, assinatura }`
  (`assinar`, hash cyrb53 com `segredoAssinatura`). Salve e leia sempre por `salvarArmazenado`/`lerArmazenado`.
  Assinatura que nao bate (editado a mao) apaga o dado e poe o nariz (`pegarAdulterado`). Dado sem assinatura vem
  de versao antiga ou foi escrito a mao: o recorde passa pelo lacre, o cofrinho so ate `limiteCofrinhoAntigo`
  (saldo + preco do comprado, `valorLoja`; acima disso e nariz) e as missoes do dia recomecam. Tudo e conferido
  ao abrir o jogo, antes do menu. O usuario sabe que isso so barra a edicao casual: quem estuda o codigo
  embaralhado passa; protecao de verdade (ranking, premio) so com um servidor conferindo as partidas.
- **A peca** (`detectarTrapaca` e, 2,2 s depois, `pregarPeca`): o guaxinim chega voando rindo ("Achou que ia me
  passar voando?"), poe um nariz de palhaco no gato (buzina "FON FON"), leva os granulados e os troncos do placar
  para o pacote ("Valeu pelos granulados, trapaceiro!") e vai embora; o gato cai. Derrota com o carimbo
  "TRAPACA DETECTADA", recorde zerado e nada no cofrinho; missoes nao contam.
- **Nariz de palhaco** (`chavePerfil`, `criarNariz`, `tamanhoNariz`, `narizDaPose`): fica no bicho da partida (no gato
  pelos olhos de `cabecaGato`; nos outros, pelo focinho em `narizBichos`, que precisa ganhar cada bicho novo com arte)
  e no gato da pintura do menu, com "Recorde: 0 · Trapaceiro". O cartao de compartilhar sai com o nariz, o carimbo "TRAPACEIRO" e
  "Tentei trapacear e o guaxinim me pegou!". Sai sozinho depois de `troncosPerdao` (50) troncos numa partida limpa
  (`devolverNariz`), o que tambem desfaz um alarme falso.

## Ranking online (Supabase)

Pedido do usuario depois que o hacker burlou tudo no navegador: o unico placar que vale e o que o servidor aceitou.
- **Liga e desliga:** `supabaseEndereco` e `supabaseChavePublica` no `GameV2.js`. Vazios, o jogo fica igual, sem o
  botao de ranking; a biblioteca do Supabase (`bibliotecaSupabase`, jsdelivr) so e baixada com eles preenchidos.
  A chave publica pode ficar no codigo; nunca coloque a chave de servico no jogo.
- **Servidor** (pasta `supabase/`, nao vai para o site): `migrations/*_ranking.sql` cria `jogadores`, `partidas` e a
  vista `ranking` (melhor partida aceita de cada jogador, por troncos). O jogo nao grava nada direto (sem politicas
  de gravacao); so le a vista e o proprio apelido. A funcao `functions/partida` (Deno) e a unica que grava:
  `comecar` anota a hora no relogio do servidor, `terminar` confere o placar pelo tempo com as regras de
  `regras.ts` (os mesmos limites do vigia: mude os dois juntos) e `apelido` troca o apelido (3 a 16 letras,
  lista de palavras proibidas). Login anonimo, sem e-mail; quem joga ganha um apelido provisorio "Gato 1234".
- **No jogo** (`online`, `mostrarRanking`, `pedirApelido`): botao redondo "Ranking" embaixo das Missoes, painel
  com os 10 melhores e o lugar do jogador, caixa de texto (HTML por cima do jogo, com o teclado do jogo desligado)
  para o apelido, e na derrota "Seu lugar no ranking: Nº". Sem internet, a partida so fica fora do ranking.
- **Testes:** `node --experimental-strip-types supabase/functions/partida/regras.test.ts`. O time pode apagar uma
  partida suspeita no painel do Supabase mudando `situacao` para `recusada`.

## Menus

- Menu: as placas fazem parte da pintura, entao nada se move sobre elas; `animarMenu` passa uma faixa de
  brilho no letreiro e no INICIAR, faz estrelinhas e escurece a placa tocada. Borboletas voam pelo menu.
- Placar (`criarHud`): troncos numa etiqueta de madeira com icone de tronco cortado, granulados numa placa
  no meio (o granulado pego voa ate ela, `voarParaPlacar`) e pausa/som em botoes redondos de madeira.
- Musica, efeitos e vibracao ligam e desligam separados (`criarOpcoesSom`, `som.opcoes`, `chaveOpcoes`), na pausa
  e em CONFIGURACOES; o botao de som do placar continua desligando tudo. A vibracao so aparece onde o aparelho
  vibra (no iPhone nao) e vale mesmo com o som desligado.
- Pausa: CONTINUAR e MENU. Derrota: JOGAR DE NOVO, COMPARTILHAR, LOJA e MENU (`criarBotaoMadeira`, `voltarAoMenu`).
- Botoes dentro de paineis fixos precisam de `setScrollFactor(0)` no proprio botao, senao o toque segue a camera.
- `scene.restart()` sem dados repete os do ultimo reinicio; `voltarAoMenu` passa `{ reiniciar: false }`.
- `index.html` mostra uma caixa "O jogo travou" com o motivo e RECARREGAR se acontecer um erro de script
  (o usuario relatou um travamento no JOGAR DE NOVO que nao foi reproduzido). O Phaser carrega com
  `crossorigin`, para a caixa mostrar o erro de verdade em vez de "Script error.".
- Ao reiniciar a cena, zere no `create` toda referencia a objeto da partida anterior antes de usa-la: o MENU
  e o JOGAR DE NOVO travavam depois de perder no espaco porque o ceu religava as folhas ja destruidas.

## Missoes e compartilhar

- **Missoes do dia** (`tiposMissao`, `missoesDoDia`, `registrarMissao`): 3 por dia sorteadas pela data (iguais
  para todos), progresso em `chaveMissoes`; "partida" vale o melhor numa partida, "dia" soma. Ao cumprir,
  faixa "MISSAO CUMPRIDA!" e o premio cai no cofrinho. Botao redondo "Missoes" no alto do menu com x/3.
- **Compartilhar** na derrota: `gerarCartaoResultado` monta uma imagem 1080 x 1350 (bicho com pelagem e
  acessorio, troncos, granulados, endereco do jogo) antes do toque, porque no iPhone o compartilhamento tem
  que sair direto do toque; `compartilharResultado` usa o compartilhar do celular, senao copia o link.

## Loja e cofrinho

- A placa SAIR do menu virou **LOJA** (um pedaco liso da madeira da propria arte cobre o texto antigo).
- Visual de madeira: `texturaMadeira` monta tabuas com a madeira lisa das placas da arte; cartoes entram em
  sequencia, a compra solta granulados e o item em uso respira.
- Os granulados de cada partida vao para o cofrinho (`chaveLoja`, salvo so no aparelho, como o recorde).
- O cofrinho, o recorde e as missoes vao assinados (ver **Dados assinados** em Anti-trapaca).
- `itensLoja`: **bichos** (o foco, decisao do usuario: animais que tambem usam o granulado - coelho, hamster,
  passaro, porquinho-da-india, iguana), **pelagens** (tint sobre o gato; so escurece ou muda o tom) e
  **acessorios** desenhados no codigo (`ac_*`), presos na cabeca por `cabecaGato` em cada uma das 4 poses.
- Bichos com arte ficam em `assets/bichos/<id>/` (parado, quasePulando, pulando, caindo `.webp`, 512 x 512,
  pes alinhados com os do gato: o corpo fisico usa essa medida). `texturaPose` troca as poses do gato pelas do
  bicho escolhido. Pelagens e acessorios valem so para o gato. O **coelho** ja tem arte; os outros estao
  "em breve".
- As artes sao geradas no Magnific do usuario (autorizado), com o bicho anterior e a pose do gato como
  referencia; o usuario escolhe as opcoes. O ambiente precisa acessar `pikaso.cdnpk.net` para baixar.

## Ideias guardadas pelo usuario (ainda nao feitas)

- Um final no topo da arvore (ninho do guaxinim + quadrinho final) - sugerido, ainda nao confirmado.

## Observacoes

- Um colega do usuario tambem edita o jogo (por sessoes do Claude Code na nuvem; antes, pelo Codex).
  Antes de comecar, traga a `main` mais nova; antes de juntar, releia o que mudou e teste de novo.
- `assets/cenariotops.png` nao e usado pelo jogo.
