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
- Setas esquerda/direita ou toque segurado nas laterais para mover.
- Apos morrer, toque, Espaco ou Enter para reiniciar.

## Arquivos

- `index.html`: pagina, canvas e carregamento do Phaser.
- `GameV2.js`: configuracao, cenas, movimento, plataformas, moedas e cenario.
- `assets/`: imagens originais e texturas usadas no jogo.

O cenario carrega `assets/Cenario Jogo.svg` e gera faixas de ate 1399 x 2048 px com bordas sobrepostas durante o carregamento, para respeitar os limites de textura do celular. O tronco, o gato inicial e o contador ficam centralizados. Uma a cada tres plataformas oscila lateralmente, levando seu granulado junto; as duas primeiras e o chao ficam parados.

O granulado dourado aparece em intervalos aleatorios de 18 a 30 plataformas e impulsiona o gato como uma mola.

## Validacao

```sh
node --check GameV2.js
```

Essa verificacao cobre a sintaxe. Para validar mudancas, abra o jogo no navegador e confira inicio, movimento, saltos, coleta, subida do cenario e reinicio. Nao ha suite de testes automatizados configurada.
