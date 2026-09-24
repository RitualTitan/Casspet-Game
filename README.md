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

- Toque, Espaco ou Enter para iniciar.
- Setas esquerda/direita ou arraste o dedo para guiar o gato na horizontal. Um toque parado nao move o gato; ao iniciar o arraste, ele segue a posicao do dedo na tela.
- Apos morrer, toque, Espaco ou Enter para reiniciar.

## Arquivos

- `index.html`: pagina, canvas e carregamento do Phaser.
- `GameV2.js`: configuracao, cenas, movimento, plataformas, moedas e cenario.
- `assets/`: imagens originais e texturas usadas no jogo.

O ceu usa `CREU-camada-0.png` ate `CREU-camada-7.png`; a arvore usa `Group3141-camada-0.png` ate `Group3141-camada-7.png`. Essas partes derivam de `CREU.png` e `Group 3141.png`, evitando carregar texturas de 32768 px de altura no jogo. Mantenha as partes versionadas.

## Validacao

```sh
node --check GameV2.js
```

Essa verificacao cobre a sintaxe. Para validar mudancas, abra o jogo no navegador e confira inicio, movimento, saltos, coleta, subida do cenario e reinicio. Nao ha suite de testes automatizados configurada.
