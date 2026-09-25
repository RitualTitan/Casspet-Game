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
- Quando o usuario pedir para "subir no git para jogar", e commit + push na `main`.
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

## Ideias guardadas pelo usuario (ainda nao feitas)

- Passarinho inimigo a partir de certa altura.
- Ceu mudando com a altura (tarde, por do sol, noite).
- Um final no topo da arvore (ninho do guaxinim + quadrinho final) - sugerido, ainda nao confirmado.

## Observacoes

- Outro agente (Codex) tambem edita esta pasta: releia os arquivos antes de alterar.
- `assets/cenariotops.png` nao e usado pelo jogo.
