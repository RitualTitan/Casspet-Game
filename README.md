# CassPads — Granulando

Jogo de plataforma vertical feito com JavaScript e Phaser 3. O gato pula automaticamente; o jogador controla o movimento lateral e coleta granulados.

## Executar

O projeto e estatico, sem etapa de build. Na pasta do projeto, inicie um servidor HTTP com uma das opcoes:

```sh
# Com Python 3
python -m http.server 8000 --bind 0.0.0.0

# Ou com Node.js (baixa o pacote serve na primeira execucao)
npx --yes serve . -l 8000
```

Abra http://localhost:8000. Em um ambiente na nuvem, exponha a porta 8000 e use a URL de preview do ambiente.

O navegador precisa de acesso a internet para carregar o Phaser 3.90 pelo CDN indicado em `index.html`.

## Controles

- Toque na placa INICIAR, Espaco ou Enter para iniciar.
- Setas esquerda/direita, A/D ou toque segurado nas laterais para mover.
- P ou Esc (ou o botao de pausa) pausa; toque na tela para continuar. O jogo pausa sozinho ao trocar de aba.
- M (ou o botao de som) liga e desliga o som. A escolha fica salva.
- Apos perder, toque, Espaco ou Enter para reiniciar.

O jogo e pensado para celular: as dicas na tela falam so dos controles de toque, e os atalhos de teclado continuam funcionando no PC.

## Arquivos

- `index.html`: pagina, canvas e carregamento do Phaser.
- `GameV2.js`: configuracao, cenas, movimento, plataformas, moedas e cenario.
- `assets/`: imagens originais e texturas usadas no jogo.
- `assets/cenario/`: faixas WebP do cenario, geradas a partir do SVG.
- `ferramentas/gerar-cenario.html`: gera as faixas do cenario.

O cenario vem da arte completa de `assets/Cenario Jogo 1.svg` (ceu, tronco e base), mas o jogo carrega faixas WebP ja desenhadas em `assets/cenario/` (cerca de 450 KB no total, contra 12 MB do SVG), o que deixa o carregamento rapido no celular. As faixas tem ate 1399 x 2048 px, com margens de filtragem que ficam fora da area desenhada. Ao gerar, a ferramenta fecha as frestas entre as formas encostadas do SVG e suaviza as emendas entre os blocos repetidos do tronco. **Sempre que o SVG mudar**, abra `http://localhost:8000/ferramentas/gerar-cenario.html` com o servidor rodando, clique em "Gerar faixas" e salve os arquivos baixados em `assets/cenario/`. A camera revela o cenario durante a subida. O ponto de partida e o chao de `assets/chao.webp` (versao reduzida para 900 px e com alfa solido de `assets/chao-original.webp`); `alturaChao` em `GameV2.js` define a altura da grama, e a terra cobre ate a borda de baixo da tela. Duas borboletas voam sobre o gramado e o gato tem uma sombra macia quando esta perto do chao. Uma a cada tres plataformas oscila lateralmente, levando seu granulado junto; as duas primeiras e o chao ficam parados.

O granulado dourado aparece em intervalos aleatorios de 18 a 30 plataformas e impulsiona o gato como uma mola.

Na primeira partida, uma historia em quadrinhos (`assets/historia.webp`, recortada em 6 quadros por `quadrosHistoria` em `GameV2.js`) explica o jogo: o guaxinim roubou o pacote de Granulado de Madeira CassPet do gato e fugiu subindo a arvore. Depois ela pode ser revista em CONFIGURACOES > HISTORIA. Para mostrar de novo na primeira partida, apague a chave `granulando.historiaVista` do `localStorage`.

Durante a partida, o guaxinim (`assets/guaxinim.png`, recorte com fundo transparente de `assets/guaxinim-original.webp`) fica sempre um tronco acima do gato, carregando o pacote e deixando cair granulados. Ele foge quando o gato se aproxima e nunca e alcancado; se ficar mais de 1,5 s fora da tela, volta saltando para um tronco visivel a frente do gato.

A cada 20 troncos o jogo acelera 25%, ate o limite de 3x a velocidade inicial. O recorde de granulados, troncos e altura fica salvo no navegador (`localStorage`); uma linha tracejada marca a altura do recorde durante a subida.

Os efeitos sonoros e a musica de fundo (objeto `musica`, com a partitura em `trilha`) sao sintetizados com Web Audio, sem arquivos de audio. A musica comeca com a partida, para na pausa e na morte e acelera junto com o jogo, ate 1,5x. As particulas (poeira, lascas, estrelas e folhas) usam texturas geradas no proprio jogo. O corpo fisico do gato (`caixa`) fica invisivel; a imagem `gato` acompanha ele a cada quadro com achatamento, inclinacao e rastro, sem alterar a area de colisao.

## Validacao

```sh
node --check GameV2.js
```

Essa verificacao cobre a sintaxe. Para validar mudancas, abra o jogo no navegador e confira inicio, movimento, saltos, coleta, subida do cenario e reinicio. Nao ha suite de testes automatizados configurada.
