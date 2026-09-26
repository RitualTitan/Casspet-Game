# Granulando (CassPads) - contexto para o Claude

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

Toda partida nova (pelo INICIAR ou depois de perder) comeca pelos quadrinhos (`assets/historia.webp`, 6 quadros
recortados por `quadrosHistoria`); decisao do usuario. O gato estava feliz com o pacote de granulado, o guaxinim
roubou e fugiu subindo a arvore, derrubando granulados pelos troncos. PULAR vai direto para o jogo; tambem pode
ser revista em CONFIGURACOES > HISTORIA.

## Publicacao

- Repositorio `RitualTitan/Casspet-Game`, branch `main`. O GitHub Pages publica a `main` em
  https://ritualtitan.github.io/Casspet-Game/ (leva ~1 min).
- **Nunca mexa direto na `main`.** Toda feature ou teste e feita num branch proprio, testada, apresentada
  (previa jogavel e/ou Pull Request) e so vai para a `main` depois que o usuario aprovar.
- Quando o usuario pedir para "subir no git para jogar" algo ja aprovado, e merge + push na `main`.
- A cada mudanca no jogo, troque o `?v=` do `GameV2.js` no `index.html`, para o celular nao usar script em cache.

## Como rodar e validar

- `python -m http.server 8000` na pasta e abrir http://localhost:8000.
- `node --check GameV2.js` para a sintaxe; depois jogar no navegador (inicio, pulos, guaxinim, derrota, reinicio).

## Cenario, chao e audio

- O cenario **nao** carrega o SVG de 12 MB. O jogo usa `assets/cenario/cenario-N.webp`, geradas por
  `ferramentas/gerar-cenario.html` a partir de `assets/Cenario Jogo 1.svg`. A ferramenta fecha as frestas
  entre formas do SVG e suaviza as emendas dos blocos repetidos do tronco. **Se o SVG mudar, gere as
  faixas de novo.** As medidas das faixas (`texturaCenario`) precisam bater entre a ferramenta e o jogo.
- Chao: `assets/chao.webp` (versao reduzida de `assets/chao-original.webp`). `alturaChao` define a altura
  da grama e `superficieChao` a linha da grama dentro da imagem.
- Guaxinim: `assets/guaxinim.png` (recorte transparente de `guaxinim-original.webp`); o pacote que ele
  carrega e a textura `fx_saco`, desenhada no codigo.
- Sons e musica sao sintetizados com Web Audio (objetos `som`, `musica` e `trilha`), sem arquivos de audio.
- **Ceu:** as faixas do cenario nao tem ceu (a ferramenta tira o degrade do SVG e deixa o fundo transparente).
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

## Loja e cofrinho

- A placa SAIR do menu virou **LOJA** (um pedaco liso da madeira da propria arte cobre o texto antigo).
- Os granulados de cada partida vao para o cofrinho (`chaveLoja`, salvo so no aparelho, como o recorde).
- `itensLoja`: **bichos** (o foco, decisao do usuario: animais que tambem usam o granulado - coelho, hamster,
  passaro, porquinho-da-india, iguana), **pelagens** (tint sobre o gato; so escurece ou muda o tom) e
  **acessorios** desenhados no codigo (`ac_*`), presos na cabeca por `cabecaGato` em cada uma das 4 poses.
- Os bichos estao "em breve": precisam de 4 poses cada (parado, quase pulando, pulando, caindo), no estilo e
  no tamanho do gato. As artes estao sendo geradas no Magnific do usuario (autorizado); a rede do ambiente
  precisa liberar `pikaso.cdnpk.net` para baixar os resultados.

## Ideias guardadas pelo usuario (ainda nao feitas)

- Um final no topo da arvore (ninho do guaxinim + quadrinho final) - sugerido, ainda nao confirmado.

## Observacoes

- Um colega do usuario tambem edita o jogo (por sessoes do Claude Code na nuvem; antes, pelo Codex).
  Antes de comecar, traga a `main` mais nova; antes de juntar, releia o que mudou e teste de novo.
- `assets/cenariotops.png` nao e usado pelo jogo.
