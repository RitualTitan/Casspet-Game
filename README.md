# Casspet® — Granulando

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
- Arraste o dedo na metade de baixo da tela: o gato anda ate ficar alinhado na vertical com o dedo e para ali. No PC, setas esquerda/direita ou A/D.
- P ou Esc (ou o botao de pausa) pausa; toque na tela para continuar. O jogo pausa sozinho ao trocar de aba.
- M (ou o botao de som) liga e desliga o som. A escolha fica salva.
- Apos perder, toque, Espaco ou Enter para reiniciar.

O jogo e pensado para celular: as dicas na tela falam so dos controles de toque, e os atalhos de teclado continuam funcionando no PC.

A tela se ajusta ao formato do celular: o mundo tem sempre 360 de largura e a altura vai de 640 (9:16) ate 860, conforme a proporcao da tela ao abrir o jogo. Telas mais largas que 9:16 (tablets, PC) ganham faixas nas laterais.

## Arquivos

- `index.html`: pagina, canvas e carregamento do Phaser.
- `GameV2.js`: configuracao, cenas, movimento, plataformas, moedas e cenario.
- `assets/`: imagens originais e texturas usadas no jogo.
- `assets/cenario/`: faixas WebP do cenario, montadas com as imagens geradas por IA.
- `arte-cenario-ia/`: prompts, guias e as imagens de IA (`recebidas/`) que formam o cenario.
- `ferramentas/montar-cenario-ia.html`: monta as faixas do cenario a partir dessas imagens.
- `ferramentas/publicar.js` e `.github/workflows/publicar.yml`: a cada push na `main`, embaralham o `GameV2.js` e publicam o jogo no repositorio publico `RitualTitan/Casspet-Game`, que o GitHub Pages mostra.
- `ferramentas/gerar-cenario.html` e `ferramentas/desenhar-cenario.html`: cenario antigo (do SVG) e primeira tentativa do novo; o jogo nao usa.

O cenario e feito com imagens geradas por IA (pe da arvore, dois trechos do tronco, copa, nuvens e galhos, em `arte-cenario-ia/recebidas/`). O jogo carrega faixas WebP ja montadas em `assets/cenario/` (cerca de 900 KB no total), o que deixa o carregamento rapido no celular. A arte tem 1024 x 12264 px em 6 faixas, com margens de filtragem que ficam fora da area desenhada. Ao montar, a ferramenta tira o fundo magenta (o ceu fica transparente), deixa todos os troncos com a mesma largura e no mesmo eixo e suaviza as emendas entre as pecas. **Sempre que uma imagem mudar**, abra `http://localhost:8000/ferramentas/montar-cenario-ia.html` com o servidor rodando, clique em "Montar faixas" e salve os arquivos baixados em `assets/cenario/`. A camera revela o cenario durante a subida.

O ceu e desenhado no jogo, atras do cenario, e muda com a altura: dia, fim de tarde (30 troncos), por do sol (65), noite (95) e espaco (150). O sol desce e avermelha ate se por, as estrelas aparecem e piscam, passam estrelas cadentes, a lua surge a noite e, no espaco, aparecem a Terra e um planeta com anel. A luz do cenario acompanha cada fase, e um aviso marca a chegada em cada uma. O ponto de partida e o chao de `assets/chao.webp` (versao reduzida para 900 px e com alfa solido de `assets/chao-original.webp`); `alturaChao` em `GameV2.js` define a altura da grama, e a terra cobre ate a borda de baixo da tela. Duas borboletas voam sobre o gramado e o gato tem uma sombra macia quando esta perto do chao. Uma a cada tres plataformas oscila lateralmente, levando seu granulado junto; as duas primeiras e o chao ficam parados.

O granulado dourado aparece em intervalos aleatorios de 18 a 30 plataformas e impulsiona o gato como uma mola.

Toda partida nova, pelo INICIAR ou depois de perder, comeca por uma historia em quadrinhos (`assets/historia.webp`, recortada em 6 quadros por `quadrosHistoria` em `GameV2.js`) que explica o jogo: o guaxinim roubou o pacote de Granulado de Madeira Casspet® do gato e fugiu subindo a arvore. O botao PULAR vai direto para o jogo, e a historia tambem pode ser revista em CONFIGURACOES > HISTORIA.

Durante a partida, o guaxinim (`assets/guaxinim.png`, recorte com fundo transparente de `assets/guaxinim-original.webp`) fica sempre um tronco acima do gato, carregando o pacote e deixando cair granulados. Ele foge quando o gato se aproxima e nunca e alcancado; se ficar mais de 1,5 s fora da tela, volta saltando para um tronco visivel a frente do gato.

A cada 20 troncos o jogo acelera 25%, ate o limite de 3x a velocidade inicial. O recorde de granulados, troncos e altura fica salvo no navegador (`localStorage`); uma linha tracejada marca a altura do recorde durante a subida.

Os efeitos sonoros e a musica de fundo (objeto `musica`, com a partitura em `trilha`) sao sintetizados com Web Audio, sem arquivos de audio. A musica comeca com a partida, para na pausa e na morte e acelera junto com o jogo, ate 1,5x. As particulas (poeira, lascas, estrelas e folhas) usam texturas geradas no proprio jogo. O corpo fisico do gato (`caixa`) fica invisivel; a imagem `gato` acompanha ele a cada quadro com achatamento, inclinacao e rastro, sem alterar a area de colisao.

## Validacao

```sh
node --check GameV2.js
```

Essa verificacao cobre a sintaxe. Para validar mudancas, abra o jogo no navegador e confira inicio, movimento, saltos, coleta, subida do cenario e reinicio. Nao ha suite de testes automatizados configurada.
